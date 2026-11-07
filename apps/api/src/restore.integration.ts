import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createReadinessCheck } from './database/readiness.js';
import { closeService, openService, serviceOpen } from './database/service-gate.js';
import { tableCounts } from './database/table-counts.js';
import { createDeletionLedger } from './identity/repositories/postgres-deletion-ledger.js';
import { createRestoredDatabase, RestoreCheckError } from './restore-application.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
if (!process.env.DELETION_LEDGER_URL?.endsWith('/education_ledger_test'))
  throw new Error('Use isolated education_ledger_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const ledgerPool = new pg.Pool({ connectionString: process.env.DELETION_LEDGER_URL });
const ledger = createDeletionLedger(ledgerPool);
const families: string[] = [];

afterAll(async () => {
  await openService(pool);
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await ledgerPool.query('DELETE FROM family_deletions WHERE family_id=ANY($1::uuid[])', [
    families,
  ]);
  await Promise.all([pool.end(), ledgerPool.end()]);
});

// A family as an old backup holds it: a parent with a session, and a child with
// a draft that is still valid and one that has expired since.
async function household() {
  const family = randomUUID();
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [
    family,
    family.replaceAll('-', '').slice(0, 12).toUpperCase(),
  ]);
  const parent = (
    await pool.query<{ id: string }>(
      `INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'fixture',true) RETURNING id`,
      [family, `${family}@example.test`],
    )
  ).rows[0]!.id;
  await pool.query(
    `INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     VALUES($1,$2,1,1,now()+interval '1 day',true)`,
    [`restore-${family}`, parent],
  );
  const child = randomUUID();
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,'小鹿','小鹿','fixture',1)`,
    [child, family],
  );
  await pool.query(
    `INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at) VALUES
       ($1,'restore-valid',1,'{}',now()+interval '1 day'),
       ($1,'restore-expired',1,'{}',now()-interval '1 minute')`,
    [child],
  );
  return family;
}

const held = async (family: string) => {
  const { rows } = await pool.query<{ families: number; sessions: number; drafts: number }>(
    `SELECT (SELECT count(*) FROM families WHERE id=$1)::int AS families,
       (SELECT count(*) FROM parent_sessions s JOIN parents p ON p.id=s.parent_id WHERE p.family_id=$1)::int AS sessions,
       (SELECT count(*) FROM drafts d JOIN children c ON c.id=d.child_id WHERE c.family_id=$1)::int AS drafts`,
    [family],
  );
  return rows[0]!;
};

it('keeps a restored database closed until every deleted family is gone, then opens it', async () => {
  const kept = await household();
  const deleted = await household();
  // The deletion was accepted and finished after the backup was taken.
  await ledger.record(deleted);
  await ledger.complete(deleted);
  const app = buildApp({ ready: await createReadinessCheck(pool) });
  const restored = createRestoredDatabase(pool, ledgerPool);
  try {
    await closeService(pool);
    expect((await app.inject('/api/v1/problems')).statusCode).toBe(503);
    expect((await app.inject('/health/ready')).statusCode).toBe(503);

    const unreachable = new pg.Pool({
      connectionString: 'postgres://education:unused@127.0.0.1:1/ledger',
      connectionTimeoutMillis: 2000,
    });
    await expect(createRestoredDatabase(pool, unreachable).replay()).rejects.toThrow();
    await unreachable.end();
    expect(await serviceOpen(pool)).toBe(false);

    const replayed = await restored.replay();
    expect(replayed.families).toBeGreaterThanOrEqual(1);
    // The deleted family's drafts go with it; the kept family's expired one is cleared.
    expect(replayed.expiredDrafts).toBeGreaterThanOrEqual(1);
    expect(await held(deleted)).toEqual({ families: 0, sessions: 0, drafts: 0 });
    expect(await held(kept)).toEqual({ families: 1, sessions: 1, drafts: 1 });

    // A deletion recorded after the replay is caught before opening.
    const late = await household();
    await ledger.record(late);
    await expect(restored.open()).rejects.toBeInstanceOf(RestoreCheckError);
    expect(await serviceOpen(pool)).toBe(false);
    expect((await app.inject('/api/v1/problems')).statusCode).toBe(503);

    await restored.replay();
    await restored.open();
    expect(await held(late)).toEqual({ families: 0, sessions: 0, drafts: 0 });
    expect((await app.inject('/health/ready')).statusCode).toBe(200);
    expect((await app.inject('/api/v1/problems')).statusCode).toBe(200);
    await restored.open();
    expect(await serviceOpen(pool)).toBe(true);
  } finally {
    await openService(pool);
    await app.close();
  }
});

it('prunes only finished deletions older than the retention period', async () => {
  const [old, recent, pending] = [randomUUID(), randomUUID(), randomUUID()];
  families.push(old, recent, pending);
  for (const family of [old, recent, pending]) await ledger.record(family);
  await ledgerPool.query(
    `UPDATE family_deletions SET completed_at = CASE family_id
       WHEN $1::uuid THEN now() - interval '16 days'
       WHEN $2::uuid THEN now() - interval '14 days' END,
     requested_at = now() - interval '20 days'
     WHERE family_id = ANY($3::uuid[])`,
    [old, recent, [old, recent, pending]],
  );
  expect(await ledger.prune(15)).toBe(1);
  const left = await ledger.recorded();
  expect(left).not.toContain(old);
  expect(left).toEqual(expect.arrayContaining([recent, pending]));
});

it('counts the rows a backup carries, without the service gate', async () => {
  const before = await tableCounts(pool);
  expect(before).not.toHaveProperty(['public.service_gate']);
  expect(before['drizzle.__drizzle_migrations']).toBeGreaterThan(0);
  await household();
  const after = await tableCounts(pool);
  expect(after['public.families']).toBe(before['public.families']! + 1);
  expect(after['public.drafts']).toBe(before['public.drafts']! + 2);
});
