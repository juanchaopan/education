import { randomBytes, randomUUID } from 'node:crypto';
import { draftBodyLimit } from '@education/contracts';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createDrafts } from './draft-application.js';
import { cleanupExpiredDrafts } from './database/draft-retention.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { deleteDraftRevision } from './learning/repositories/postgres-draft.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const problem = { id: 'test-draft', version: 1 };
const path = '/api/v1/problems/test-draft/1/draft';
const content = { stepId: 'compare', drawing: [[{ x: 0.3, y: 0.4 }]] };
const next = { ...content, stepId: 'explain' };
const makeApp = () =>
  buildApp({
    origin,
    drafts: createDrafts(
      pool,
      (id, version) => id === problem.id && (version === 1 || version === Number.MAX_SAFE_INTEGER),
    ),
  });
const first = makeApp();
const second = makeApp();

afterAll(async () => {
  await Promise.all([first.close(), second.close()]);
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function child() {
  const family = randomUUID();
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [
    family,
    family.replaceAll('-', '').slice(0, 12).toUpperCase(),
  ]);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,'小鹿','小鹿','fixture',1)`,
    [id, family],
  );
  async function session() {
    const token = randomBytes(32).toString('base64url');
    await pool.query(
      `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
       VALUES($1,$2,1,1,now()+interval '1 day')`,
      [tokenHash(token), id],
    );
    return {
      origin,
      cookie: `__Host-education_session=${token}`,
      'x-csrf-token': csrfToken(token),
      'x-education-request': 'session',
      'content-type': 'application/json',
    };
  }
  return { id, session };
}

function save(
  headers: Record<string, string>,
  revision: string | null,
  payload = content,
  app = first,
) {
  return app.inject({
    method: 'POST',
    url: path,
    headers,
    payload: { action: 'save', revision, content: payload },
  });
}

it('restores across sessions, lets one competing save win, and isolates other children', async () => {
  const owner = await child();
  const a = await owner.session(),
    b = await owner.session(),
    other = await (await child()).session();
  const created = (await save(a, null)).json().draft;
  const [left, right] = await Promise.all([
    save(a, created.revision, next),
    save(b, created.revision, { ...content, stepId: 'try-again' }, second),
  ]);
  expect([left.statusCode, right.statusCode].sort()).toEqual([200, 409]);
  const winner = (left.statusCode === 200 ? left : right).json();
  expect(left.json()).toEqual(winner);
  expect(right.json()).toEqual(winner);
  expect(winner.draft.revision).not.toBe(created.revision);
  const read = await second.inject({ url: path, headers: b });
  expect(read.json()).toEqual(winner);
  expect(read.headers['cache-control']).toBe('no-store');
  expect((await second.inject({ url: path, headers: other })).json()).toEqual({ draft: null });
  expect((await save(other, winner.draft.revision)).statusCode).toBe(409);
});

it('expires on read without extending unchanged ink and purges unread expired drafts', async () => {
  const owner = await child(),
    headers = await owner.session();
  const saved = (await save(headers, null)).json().draft;
  const ttl = Date.parse(saved.expiresAt) - Date.now();
  expect(ttl).toBeGreaterThan(7 * 86400000 - 60000);
  expect(ttl).toBeLessThan(7 * 86400000 + 1000);
  expect((await save(headers, saved.revision)).json().draft).toEqual(saved);
  await pool.query('UPDATE drafts SET expires_at=now() WHERE child_id=$1', [owner.id]);
  expect((await first.inject({ url: path, headers })).json()).toEqual({ draft: null });
  expect((await pool.query('SELECT 1 FROM drafts WHERE child_id=$1', [owner.id])).rowCount).toBe(0);
  expect((await save(headers, saved.revision)).statusCode).toBe(409);
  await save(headers, null);
  await pool.query('UPDATE drafts SET expires_at=now() WHERE child_id=$1', [owner.id]);
  expect(await cleanupExpiredDrafts(pool)).toBeGreaterThanOrEqual(1);
  expect((await pool.query('SELECT 1 FROM drafts WHERE child_id=$1', [owner.id])).rowCount).toBe(0);
});

it('compares discard versions and supports transactional deletion without erasing a newer draft', async () => {
  const owner = await child(),
    headers = await owner.session();
  const saved = (await save(headers, null)).json().draft;
  const newer = (await save(headers, saved.revision, next)).json().draft;
  const discard = (revision: string) =>
    first.inject({ method: 'POST', url: path, headers, payload: { action: 'discard', revision } });
  expect((await discard(saved.revision)).statusCode).toBe(409);
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    expect(await deleteDraftRevision(connection, owner.id, problem, saved.revision)).toBe(false);
    expect(await deleteDraftRevision(connection, owner.id, problem, newer.revision)).toBe(true);
    await connection.query('ROLLBACK');
  } finally {
    connection.release();
  }
  expect((await first.inject({ url: path, headers })).json().draft).toEqual(newer);
  expect((await discard(newer.revision)).json()).toEqual({ draft: null });
  const recreated = (await save(headers, null)).json().draft;
  expect(recreated.revision).not.toBe(newer.revision);
  expect((await discard(newer.revision)).statusCode).toBe(409);
});

it('rejects unbound sessions, forged inputs, unknown versions and any raw audio field', async () => {
  const owner = await child(),
    headers = await owner.session();
  expect((await first.inject({ url: path })).statusCode).toBe(401);
  expect((await save({ ...headers, origin: 'https://other.example' }, null)).statusCode).toBe(403);
  expect(
    (await first.inject({ url: path, headers: { ...headers, 'x-csrf-token': 'wrong' } }))
      .statusCode,
  ).toBe(403);
  const forged = { ...content, audio: 'fixture' };
  expect((await save(headers, null, forged)).statusCode).toBe(400);
  expect((await save(headers, null, { ...content, drawing: [[{ x: -1, y: 0 }]] })).statusCode).toBe(
    400,
  );
  expect(
    (await first.inject({ url: path.replace('test-draft', 'unknown'), headers })).statusCode,
  ).toBe(404);
  await pool.query('UPDATE children SET credential_version=2 WHERE id=$1', [owner.id]);
  expect((await save(headers, null)).statusCode).toBe(401);
});

it('supports separate drafts for catalog versions and caps request bytes before validation', async () => {
  const headers = await (await child()).session();
  const versionPath = path.replace('/1/', `/${Number.MAX_SAFE_INTEGER}/`);
  const old = await save(headers, null);
  expect(old.statusCode).toBe(200);
  const modern = await second.inject({
    method: 'POST',
    url: versionPath,
    headers,
    payload: { action: 'save', revision: null, content: next },
  });
  expect(modern.statusCode).toBe(200);
  expect((await second.inject({ url: versionPath, headers })).json().draft.content).toEqual(next);
  expect((await second.inject({ url: path, headers })).json()).toEqual(old.json());
  expect(
    (
      await second.inject({
        method: 'POST',
        url: path,
        headers,
        payload: { data: 'x'.repeat(draftBodyLimit) },
      })
    ).statusCode,
  ).toBe(413);
});
