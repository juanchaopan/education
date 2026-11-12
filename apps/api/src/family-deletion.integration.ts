import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { familyDeletionPhrase } from '@education/contracts';
import { buildApp } from './app.js';
import { createDrafts } from './draft-application.js';
import { createFamilyDeletion } from './family-deletion-application.js';
import { createFamilyExport } from './family-export-application.js';
import { removeFamily } from './identity/repositories/postgres-family-removal.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
if (!process.env.DELETION_LEDGER_URL?.endsWith('/education_ledger_test'))
  throw new Error('Use isolated education_ledger_test');

type Server = ReturnType<typeof buildApp>;
type Headers = Record<string, string>;

const origin = 'https://education.example';
const families: string[] = [];
// A deleted family's usage rows no longer name it, so they are tracked by ID:
// left behind, they would count against later tests' monthly budgets.
const usageRows: string[] = [];
const pools = [0, 1].map(() => new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const pool = pools[0]!;
const ledgerPool = new pg.Pool({ connectionString: process.env.DELETION_LEDGER_URL });
const draftPath = '/api/v1/problems/test-deletion/1/draft';
// Two servers with their own connection pools, as two deployed instances would have.
const servers = pools.map((from) =>
  buildApp({
    origin,
    familyDeletion: createFamilyDeletion(from, ledgerPool),
    familyExport: createFamilyExport(from),
    drafts: createDrafts(from, (id) => id === 'test-deletion'),
  }),
);
const [first, second] = servers as [Server, Server];

afterAll(async () => {
  await Promise.all(servers.map((server) => server.close()));
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.query('DELETE FROM ai_usage WHERE id=ANY($1::uuid[])', [usageRows]);
  await ledgerPool.query('DELETE FROM family_deletions WHERE family_id=ANY($1::uuid[])', [
    families,
  ]);
  await Promise.all([...pools, ledgerPool].map((each) => each.end()));
});

const headersFor = (token: string) => ({
  cookie: `__Host-education_session=${token}`,
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
});

async function household() {
  const family = randomUUID();
  const parentToken = randomBytes(32).toString('base64url');
  const childToken = randomBytes(32).toString('base64url');
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [family, `CODE-${family}`]);
  const parent = (
    await pool.query<{ id: string }>(
      `INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'private-password-hash',true) RETURNING id`,
      [family, `${family}@example.test`],
    )
  ).rows[0]!.id;
  await pool.query(
    `INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified,password_verified_at)
     VALUES($1,$2,1,1,now()+interval '1 day',true,clock_timestamp())`,
    [tokenHash(parentToken), parent],
  );
  await pool.query(
    `INSERT INTO email_verifications(parent_id,id,token_hash,status,expires_at)
     VALUES($1,$2,$3,'verified',now()+interval '1 day')`,
    [parent, randomUUID(), `private-mail-${family}`],
  );
  const child = (
    await pool.query<{ id: string }>(
      `INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,'小鹿','小鹿','private-pin-hash',1) RETURNING id`,
      [family],
    )
  ).rows[0]!.id;
  await pool.query(
    `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     VALUES($1,$2,1,1,now()+interval '1 day')`,
    [tokenHash(childToken), child],
  );
  await learning(family, child);
  return { family, child, parent: headersFor(parentToken), learner: headersFor(childToken) };
}

async function learning(family: string, child: string) {
  const round = randomUUID();
  await pool.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,independent) VALUES($1,'apples',1,$2,1)`,
    [child, round],
  );
  await pool.query(
    `INSERT INTO attempts(child_id,problem_id,problem_version,attempt_id,round,fingerprint,outcome)
     VALUES($1,'apples',1,$2,$3,'private-fingerprint','independent')`,
    [child, randomUUID(), round],
  );
  await pool.query(
    `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id) VALUES($1,'apples',1,$2,'count')`,
    [child, round],
  );
  await pool.query(
    `INSERT INTO assignments(child_id,problem_id,problem_version) VALUES($1,'apples',1)`,
    [child],
  );
  await pool.query(`INSERT INTO book_assignments(child_id,book_id) VALUES($1,'g1-math-xueersi')`, [
    child,
  ]);
  await pool.query(
    `INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at)
     VALUES($1,'test-deletion',1,$2,now()+interval '1 day')`,
    [child, { stepId: 'count', drawing: [[{ x: 0.25, y: 0.5 }]] }],
  );
  await pool.query(
    `INSERT INTO registration_keys(family_id,key_hash,expires_at) VALUES($1,$2,now()+interval '1 day')`,
    [family, `private-key-${family}`],
  );
  await pool.query(
    `INSERT INTO ai_consents(family_id,scope,policy_version,granted) VALUES($1,'openai-tutoring',1,true)`,
    [family],
  );
  const usage = await pool.query<{ id: string }>(
    `INSERT INTO ai_usage(family_id,child_id,model,budget_month,admitted_at,state,amount_nanodollars)
     VALUES($1,$2,'fixture-model',date_trunc('month',now())::date,now(),'settled',1234) RETURNING id`,
    [family, child],
  );
  usageRows.push(usage.rows[0]!.id);
}

const deleteFamily = (
  headers: Headers,
  app: Server = first,
  confirmation: string = familyDeletionPhrase,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/parents/family-deletion',
    headers,
    payload: { confirmation },
  });
const exportFrom = (app: Server, headers: Headers) =>
  app.inject({ method: 'POST', url: '/api/v1/parents/family-export', headers, payload: {} });
const readDraft = (app: Server, headers: Headers) => app.inject({ url: draftPath, headers });
// A server whose family removal fails the given number of times before it works.
function serverFailingRemovals(failures: number) {
  let left = failures;
  const flaky: typeof removeFamily = async (client, family) => {
    if (left-- > 0) throw new Error('connection lost');
    await removeFamily(client, family);
  };
  return buildApp({ origin, familyDeletion: createFamilyDeletion(pool, ledgerPool, flaky) });
}

async function remaining(family: string, child: string) {
  const { rows } = await pool.query<Record<string, number>>(
    `SELECT
       (SELECT count(*) FROM families WHERE id=$1)::int AS families,
       (SELECT count(*) FROM parents WHERE family_id=$1)::int AS parents,
       (SELECT count(*) FROM parent_sessions s JOIN parents p ON p.id=s.parent_id WHERE p.family_id=$1)::int AS "parentSessions",
       (SELECT count(*) FROM children WHERE family_id=$1)::int AS children,
       (SELECT count(*) FROM child_sessions WHERE child_id=$2)::int AS "childSessions",
       (SELECT count(*) FROM email_verifications v JOIN parents p ON p.id=v.parent_id WHERE p.family_id=$1)::int AS mail,
       (SELECT count(*) FROM progress WHERE child_id=$2)::int AS progress,
       (SELECT count(*) FROM attempts WHERE child_id=$2)::int AS attempts,
       (SELECT count(*) FROM help_events WHERE child_id=$2)::int AS hints,
       (SELECT count(*) FROM assignments WHERE child_id=$2)::int AS assignments,
       (SELECT count(*) FROM book_assignments WHERE child_id=$2)::int AS "bookAssignments",
       (SELECT count(*) FROM drafts WHERE child_id=$2)::int AS drafts,
       (SELECT count(*) FROM registration_keys WHERE family_id=$1)::int AS keys,
       (SELECT count(*) FROM ai_consents WHERE family_id=$1)::int AS consents,
       (SELECT count(*) FROM ai_usage WHERE family_id=$1 OR child_id=$2)::int AS "linkedUsage"`,
    [family, child],
  );
  return rows[0]!;
}

const nothingLeft = {
  families: 0,
  parents: 0,
  parentSessions: 0,
  children: 0,
  childSessions: 0,
  mail: 0,
  progress: 0,
  attempts: 0,
  hints: 0,
  assignments: 0,
  bookAssignments: 0,
  drafts: 0,
  keys: 0,
  consents: 0,
  linkedUsage: 0,
};

async function ledgerEntry(family: string) {
  const { rows } = await ledgerPool.query<{ done: boolean }>(
    'SELECT completed_at IS NOT NULL AS done FROM family_deletions WHERE family_id=$1',
    [family],
  );
  return rows[0];
}

async function fixtureCost() {
  const { rows } = await pool.query<{ total: string }>(
    'SELECT sum(amount_nanodollars)::text AS total FROM ai_usage WHERE id=ANY($1::uuid[])',
    [usageRows],
  );
  return rows[0]!.total;
}

it('deletes only this family, signs out every device on every server and records the ledger', async () => {
  const owner = await household();
  const other = await household();
  expect((await readDraft(second, owner.learner)).statusCode).toBe(200);
  const cost = await fixtureCost();

  const response = await deleteFamily(owner.parent);
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'deleted' });
  expect(response.headers['set-cookie']).toContain('Max-Age=0');

  expect(await remaining(owner.family, owner.child)).toEqual(nothingLeft);
  expect(await ledgerEntry(owner.family)).toEqual({ done: true });
  for (const app of servers) expect((await readDraft(app, owner.learner)).statusCode).toBe(401);
  expect((await exportFrom(second, owner.parent)).statusCode).toBe(401);
  expect((await deleteFamily(owner.parent, second)).statusCode).toBe(401);

  expect(await remaining(other.family, other.child)).toMatchObject({
    drafts: 1,
    bookAssignments: 1,
  });
  expect((await exportFrom(second, other.parent)).statusCode).toBe(200);
  expect(await ledgerEntry(other.family)).toBeUndefined();
  expect(await fixtureCost()).toBe(cost);
});

it('records and removes nothing without the phrase or a recent password', async () => {
  const owner = await household();
  expect((await deleteFamily(owner.parent, first, '删除')).statusCode).toBe(422);
  await pool.query(
    `UPDATE parent_sessions SET password_verified_at=clock_timestamp()-interval '6 minutes'
     WHERE parent_id IN (SELECT id FROM parents WHERE family_id=$1)`,
    [owner.family],
  );
  expect((await deleteFamily(owner.parent)).statusCode).toBe(403);
  expect((await remaining(owner.family, owner.child)).families).toBe(1);
  expect(await ledgerEntry(owner.family)).toBeUndefined();
});

it('lets parent requests queued behind a deletion finish without deadlock, then refuses them', async () => {
  const owner = await household();
  // A child request in progress holds the family shared, so the deletion waits
  // for it while parent requests on both servers queue behind the deletion.
  const holder = await pool.connect();
  try {
    await holder.query('BEGIN');
    await holder.query('SELECT id FROM families WHERE id=$1 FOR SHARE', [owner.family]);
    const deletion = deleteFamily(owner.parent);
    await waitForLockWaiters(1);
    const queued = [
      deleteFamily(owner.parent, second),
      exportFrom(first, owner.parent),
      exportFrom(second, owner.parent),
    ];
    await waitForLockWaiters(4);
    await holder.query('COMMIT');
    expect((await deletion).statusCode).toBe(200);
    expect((await Promise.all(queued)).map((response) => response.statusCode)).toEqual([
      401, 401, 401,
    ]);
  } finally {
    holder.release();
  }
  expect((await readDraft(second, owner.learner)).statusCode).toBe(401);
  expect(await remaining(owner.family, owner.child)).toEqual(nothingLeft);
});

it('removes a recorded family on its own when the signed-in transaction fails', async () => {
  const owner = await household();
  const response = await deleteFamily(owner.parent, serverFailingRemovals(1));
  expect(response.statusCode).toBe(200);
  expect(await remaining(owner.family, owner.child)).toEqual(nothingLeft);
  expect(await ledgerEntry(owner.family)).toEqual({ done: true });
});

it('finishes a deletion left pending, and repeating it changes nothing', async () => {
  const owner = await household();
  const response = await deleteFamily(owner.parent, serverFailingRemovals(2));
  expect(response.statusCode).toBe(202);
  expect(response.json()).toEqual({ status: 'pending' });
  expect((await remaining(owner.family, owner.child)).families).toBe(1);
  expect(await ledgerEntry(owner.family)).toEqual({ done: false });

  const maintenance = createFamilyDeletion(pool, ledgerPool)!;
  const outcome = await maintenance.completePending();
  expect(outcome.completed).toBeGreaterThanOrEqual(1);
  expect(outcome.failed).toBe(0);
  expect(await remaining(owner.family, owner.child)).toEqual(nothingLeft);
  expect(await ledgerEntry(owner.family)).toEqual({ done: true });
  await maintenance.completePending();
  expect(await ledgerEntry(owner.family)).toEqual({ done: true });
});

it('keeps the family when the ledger cannot be reached', async () => {
  const owner = await household();
  const unreachable = new pg.Pool({
    connectionString: process.env.DELETION_LEDGER_URL!.replace(
      /\/education_ledger_test$/,
      '/education_ledger_missing',
    ),
  });
  try {
    const response = await deleteFamily(
      owner.parent,
      buildApp({ origin, familyDeletion: createFamilyDeletion(pool, unreachable) }),
    );
    expect(response.statusCode).toBe(503);
    expect(response.headers['set-cookie']).toBeUndefined();
  } finally {
    await unreachable.end();
  }
  expect((await remaining(owner.family, owner.child)).families).toBe(1);
  expect((await exportFrom(first, owner.parent)).statusCode).toBe(200);
});

// Waits until this many backends of the test database are waiting for a lock.
async function waitForLockWaiters(count: number) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { rows } = await pool.query<{ waiting: number }>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity
       WHERE datname=current_database() AND wait_event_type='Lock'`,
    );
    if (rows[0]!.waiting >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Fewer than ${count} requests waited for the family`);
}
