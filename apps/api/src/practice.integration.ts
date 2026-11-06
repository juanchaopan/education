import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { createProblemRegistry } from '@education/problems/server';
import { buildApp } from './app.js';
import { createPracticeAssignments } from './practice-application.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const summary = {
  id: 'fixture-pattern',
  version: 2,
  title: '辨认规律',
  grade: '一年级',
  subject: '数学',
  category: '规律',
  sequence: 1,
};
const registry = createProblemRegistry([{ summary }]);
const app = buildApp({ origin, practice: createPracticeAssignments(pool, registry) });

afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function household(verified = true) {
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  families.push(family);
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'fixture',$3) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     SELECT $4,id,1,1,now()+interval '1 day',$3 FROM parent`,
    [family, `${family}@example.test`, verified, tokenHash(token)],
  );
  return { family, token };
}

async function learner(family: string, nickname: string) {
  const id = randomUUID(),
    token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,$3,$3,'fixture',1)`,
    [id, family, nickname],
  );
  await pool.query(
    `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     VALUES($1,$2,1,1,now()+interval '1 day')`,
    [tokenHash(token), id],
  );
  return { id, token };
}

const childPath = '/api/v1/children/practice';
const parentPath = (id: string) => `/api/v1/parents/children/${id}/practice`;
const headers = (token: string) => ({
  cookie: `__Host-education_session=${token}`,
  origin,
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
});
const read = (url: string, token: string) => app.inject({ url, headers: headers(token) });
const assign = (id: string, token: string, version = 2, extra = {}) =>
  app.inject({
    method: 'POST',
    url: parentPath(id),
    headers: { ...headers(token), ...extra },
    payload: { id: summary.id, version },
  });

it('deduplicates concurrent assignments and returns only the selected child’s practice', async () => {
  const owner = await household();
  const child = await learner(owner.family, '小鹿');
  const sibling = await learner(owner.family, '小猫');
  const foreign = await household();
  const outsider = await learner(foreign.family, '小鸟');
  const results = await Promise.all(Array.from({ length: 5 }, () => assign(child.id, owner.token)));
  expect(results.map(({ statusCode }) => statusCode)).toEqual([204, 204, 204, 204, 204]);
  const page = { problems: [{ id: summary.id, version: 2, title: summary.title }], hasMore: false };
  const own = await read(childPath, child.token);
  expect(own.json()).toEqual(page);
  expect(own.headers['cache-control']).toBe('no-store');
  expect(own.headers.vary).toBe('Cookie');
  expect((await read(parentPath(child.id), owner.token)).json()).toEqual(page);
  for (const other of [sibling, outsider])
    expect((await read(childPath, other.token)).json()).toEqual({ problems: [], hasMore: false });
  expect((await read(`${childPath}?childId=${child.id}`, sibling.token)).statusCode).toBe(400);
  await pool.query('DELETE FROM children WHERE id=$1', [child.id]);
  expect(
    (await pool.query('SELECT 1 FROM assignments WHERE child_id=$1', [child.id])).rowCount,
  ).toBe(0);
});

it('rejects foreign, missing, unverified and revoked credentials and requires exact-origin CSRF', async () => {
  const owner = await household();
  const child = await learner(owner.family, '小鹿');
  const other = await household();
  const unverified = await household(false);
  expect((await read(childPath, owner.token)).statusCode).toBe(401);
  expect((await assign(child.id, child.token)).statusCode).toBe(401);
  expect((await assign(child.id, unverified.token)).statusCode).toBe(401);
  expect((await read(childPath, '')).statusCode).toBe(401);
  expect((await assign(child.id, other.token)).statusCode).toBe(404);
  expect((await read(parentPath(child.id), other.token)).json()).toEqual(
    (await read(parentPath(randomUUID()), other.token)).json(),
  );
  expect(
    (await assign(child.id, owner.token, 2, { origin: 'https://other.example' })).statusCode,
  ).toBe(403);
  expect((await assign(child.id, owner.token, 2, { 'x-csrf-token': 'invalid' })).statusCode).toBe(
    403,
  );
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [owner.family]);
  expect((await read(childPath, child.token)).statusCode).toBe(401);
  expect((await assign(child.id, owner.token)).statusCode).toBe(401);
});

it('reports unavailable versions, keeps their assignments, and bounds each page', async () => {
  const owner = await household();
  const child = await learner(owner.family, '小鹿');
  expect((await assign(child.id, owner.token, 1)).statusCode).toBe(409);
  await pool.query(
    `INSERT INTO assignments(child_id,problem_id,problem_version)
     SELECT $1,$2,n FROM generate_series(1,21) n`,
    [child.id, summary.id],
  );
  const first = (await read(childPath, child.token)).json();
  expect(first).toMatchObject({ hasMore: true });
  expect(first.problems).toHaveLength(20);
  expect(first.problems[0]).toEqual({ id: summary.id, version: 1, title: null });
  expect(first.problems[1]).toEqual({ id: summary.id, version: 2, title: summary.title });
  expect((await read(`${childPath}?offset=20`, child.token)).json()).toEqual({
    hasMore: false,
    problems: [{ id: summary.id, version: 21, title: null }],
  });
});
