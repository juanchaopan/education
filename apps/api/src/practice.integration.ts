import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { createProblemRegistry } from '@education/problems/server';
import { buildApp } from './app.js';
import { createPracticeAssignments } from './practice-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';

const { pool, household, learner, close } = familyFixtures();
const book = { id: 'fixture-patterns', grade: '一年级', subject: '数学', category: '规律' };
const summary = {
  id: 'fixture-pattern',
  version: 2,
  title: '辨认规律',
  book: book.id,
  sequence: 1,
};
const registry = createProblemRegistry([{ summary }], [book]);
const app = buildApp({
  origin: fixtureOrigin,
  practice: createPracticeAssignments(pool, registry),
});

afterAll(async () => {
  await app.close();
  await close();
});

const childPath = '/api/v1/children/practice';
const parentPath = (id: string) => `/api/v1/parents/children/${id}/practice`;
const read = (url: string, token: string) => app.inject({ url, headers: sessionHeaders(token) });
const assign = (id: string, token: string, version = 2, extra = {}) =>
  app.inject({
    method: 'POST',
    url: parentPath(id),
    headers: { ...sessionHeaders(token), ...extra },
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
