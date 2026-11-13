import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import type { FamilyOverview, LearningRange, StudyDays } from '@education/contracts';
import { buildApp } from './app.js';
import { createFamilyOverview } from './family-overview-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';

const { pool, household, learner, close } = familyFixtures();
// 20:30 on 12 November 2026 in Toronto, already 13 November in China.
const now = new Date('2026-11-13T01:30:00Z');
const app = buildApp({
  origin: fixtureOrigin,
  familyOverview: createFamilyOverview(
    pool,
    'Asia/Shanghai',
    (id, version) => (id === 'garden' && version === 2 ? '菜园天平' : undefined),
    () => now,
  ),
});

afterAll(async () => {
  await app.close();
  await close();
});

type Outcome = 'independent' | 'assisted' | 'incorrect' | 'uncertain';

async function answer(
  childId: string,
  problemId: string,
  outcome: Outcome,
  at: string,
  version = 1,
) {
  await pool.query(
    `INSERT INTO attempts(child_id,problem_id,problem_version,attempt_id,round,fingerprint,outcome,submitted_at)
     VALUES($1,$2,$3,$4,$5,'fixture',$6,$7)`,
    [childId, problemId, version, randomUUID(), randomUUID(), outcome, at],
  );
}

async function hint(childId: string, problemId: string, at: string) {
  await pool.query(
    `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id,requested_at)
     VALUES($1,$2,1,$3,'observe',$4)`,
    [childId, problemId, randomUUID(), at],
  );
}

async function studied(childId: string, day: string, seconds: number) {
  await pool.query('INSERT INTO study_days(child_id,day,seconds) VALUES($1,$2,$3)', [
    childId,
    day,
    seconds,
  ]);
}

async function progress(childId: string, problemId: string, version: number, incorrect: number) {
  await pool.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,incorrect) VALUES($1,$2,$3,$4,$5)`,
    [childId, problemId, version, randomUUID(), incorrect],
  );
}

// A family in Toronto whose first child studied on two days and the second
// not at all.
async function torontoFamily() {
  const parent = await household();
  await pool.query(`UPDATE families SET time_zone='America/Toronto' WHERE id=$1`, [parent.family]);
  const kitten = await learner(parent.family, '小猫');
  const fawn = await learner(parent.family, '小鹿');
  // 23:30 on 11 November in Toronto: still the 11th there.
  await answer(kitten.id, 'garden', 'incorrect', '2026-11-12T04:30:00Z', 2);
  await answer(kitten.id, 'garden', 'incorrect', '2026-11-12T04:31:00Z', 2);
  await progress(kitten.id, 'garden', 2, 2);
  await answer(kitten.id, 'garden', 'independent', '2026-11-12T20:00:00Z');
  await answer(kitten.id, 'trains', 'uncertain', '2026-11-12T20:05:00Z');
  await hint(kitten.id, 'pattern', '2026-11-12T20:10:00Z');
  await answer(kitten.id, 'pattern', 'assisted', '2026-11-12T20:11:00Z');
  await studied(kitten.id, '2026-11-11', 300);
  await studied(kitten.id, '2026-11-12', 720);
  return { parent, kitten, fawn };
}

const read = <T>(token: string, url: string) =>
  app.inject({ url, headers: sessionHeaders(token) }).then((reply) => ({
    status: reply.statusCode,
    body: reply.json<T>(),
  }));

it("gives every child the days of the family's own zone, in one reply", async () => {
  const { parent, kitten, fawn } = await torontoFamily();
  const { status, body } = await read<FamilyOverview>(parent.token, '/api/v1/parents/overview');
  expect(status).toBe(200);
  expect(body.timeZone).toBe('America/Toronto');
  expect(body.today).toBe('2026-11-12');
  expect(body.children.map(({ id }) => id)).toEqual([kitten.id, fawn.id]);
  const days = body.children[0]!.days;
  expect(days).toHaveLength(28);
  expect(days.slice(-2)).toEqual([
    {
      date: '2026-11-11',
      seconds: 300,
      problems: { independent: 0, assisted: 0, open: 1 },
      ids: [['garden', 'open']],
    },
    {
      date: '2026-11-12',
      seconds: 720,
      problems: { independent: 1, assisted: 1, open: 1 },
      ids: [
        ['garden', 'independent'],
        ['pattern', 'assisted'],
        ['trains', 'open'],
      ],
    },
  ]);
  expect(body.children[0]!.earliest).toBe('2026-11-11');
  expect(body.children[0]!.review).toEqual([
    { id: 'garden', version: 2, title: '菜园天平', incorrect: 2 },
  ]);
  expect(body.children[1]).toMatchObject({ earliest: null, review: [] });
});

it('reads earlier days a block at a time, and a stretch of up to seven days in detail', async () => {
  const { parent, kitten } = await torontoFamily();
  const earlier = await read<StudyDays>(
    parent.token,
    `/api/v1/parents/children/${kitten.id}/days?to=2026-11-11`,
  );
  expect(earlier.status).toBe(200);
  expect(earlier.body.days.at(-1)).toMatchObject({ date: '2026-11-11', seconds: 300 });
  const stretch = await read<LearningRange>(
    parent.token,
    `/api/v1/parents/children/${kitten.id}/learning?from=2026-11-11&to=2026-11-12`,
  );
  expect(stretch.status).toBe(200);
  expect(stretch.body).toMatchObject({
    seconds: 1020,
    problems: { independent: 1, assisted: 1, open: 1 },
    total: { problems: 3, seconds: 1020 },
  });
  expect(
    stretch.body.items.map(({ id, state, attempts, hints }) => [id, state, attempts, hints]),
  ).toEqual([
    ['garden', 'independent', 3, 0],
    ['pattern', 'assisted', 1, 1],
    ['trains', 'open', 1, 0],
  ]);
});

it("shows a family nothing of another family's children", async () => {
  const parent = await household();
  const { kitten } = await torontoFamily();
  expect(
    (await read<FamilyOverview>(parent.token, '/api/v1/parents/overview')).body.children,
  ).toEqual([]);
  const days = await read(parent.token, `/api/v1/parents/children/${kitten.id}/days?to=2026-11-11`);
  expect(days.status).toBe(404);
  const stretch = await read(
    parent.token,
    `/api/v1/parents/children/${kitten.id}/learning?from=2026-11-12&to=2026-11-12`,
  );
  expect(stretch.status).toBe(404);
});

it('turns away days still to come and stretches longer than seven days', async () => {
  const { parent, kitten } = await torontoFamily();
  const future = await read(
    parent.token,
    `/api/v1/parents/children/${kitten.id}/days?to=2026-11-13`,
  );
  expect(future.status).toBe(400);
  const long = await read(
    parent.token,
    `/api/v1/parents/children/${kitten.id}/learning?from=2026-11-05&to=2026-11-12`,
  );
  expect(long.status).toBe(400);
});

it('turns away a session that is not signed in or not verified', async () => {
  const unverified = await household(false);
  expect((await app.inject({ url: '/api/v1/parents/overview' })).statusCode).toBe(401);
  expect((await read(unverified.token, '/api/v1/parents/overview')).status).toBe(401);
});
