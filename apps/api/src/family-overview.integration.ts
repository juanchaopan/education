import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createFamilyOverview } from './family-overview-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';

const { pool, household, learner, close } = familyFixtures();
const app = buildApp({
  origin: fixtureOrigin,
  familyOverview: createFamilyOverview(pool, (id, version) =>
    id === 'garden' && version === 2 ? '菜园天平' : undefined,
  ),
});

afterAll(async () => {
  await app.close();
  await close();
});

type Counts = { independent?: number; assisted?: number; incorrect?: number };

// A problem version's record as the answers left it, written directly.
async function progress(childId: string, problemId: string, version: number, counts: Counts) {
  await pool.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,independent,assisted,incorrect)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [
      childId,
      problemId,
      version,
      randomUUID(),
      counts.independent ?? 0,
      counts.assisted ?? 0,
      counts.incorrect ?? 0,
    ],
  );
}

async function hint(childId: string, problemId: string) {
  await pool.query(
    `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id)
     VALUES($1,$2,1,$3,'observe')`,
    [childId, problemId, randomUUID()],
  );
}

const read = (token: string) =>
  app.inject({ url: '/api/v1/parents/overview', headers: sessionHeaders(token) });

it("adds up every child's whole record in one reply, in the family's order", async () => {
  const parent = await household();
  const kitten = await learner(parent.family, '小猫');
  const fawn = await learner(parent.family, '小鹿');
  await progress(kitten.id, 'garden', 1, { independent: 1, assisted: 2, incorrect: 1 });
  await progress(kitten.id, 'garden', 2, { incorrect: 3, assisted: 1 });
  await progress(kitten.id, 'pattern', 1, { independent: 2 });
  await hint(kitten.id, 'hint-only');
  const reply = await read(parent.token);
  expect(reply.statusCode).toBe(200);
  expect(reply.headers['cache-control']).toBe('no-store');
  expect(reply.json()).toEqual({
    children: [
      {
        id: kitten.id,
        total: { problems: 3, independent: 3, assisted: 3 },
        review: [{ id: 'garden', version: 2, title: '菜园天平', incorrect: 3 }],
      },
      { id: fawn.id, total: { problems: 0, independent: 0, assisted: 0 }, review: [] },
    ],
  });
});

it("shows a family nothing of another family's children", async () => {
  const parent = await household();
  const other = await household();
  const stranger = await learner(other.family, '小熊');
  await progress(stranger.id, 'pattern', 1, { independent: 1 });
  expect((await read(parent.token)).json()).toEqual({ children: [] });
});

it('turns away a session that is not signed in or not verified', async () => {
  const unverified = await household(false);
  expect((await app.inject({ url: '/api/v1/parents/overview' })).statusCode).toBe(401);
  expect((await read(unverified.token)).statusCode).toBe(401);
});
