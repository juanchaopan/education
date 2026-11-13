import { afterAll, expect, it } from 'vitest';
import { localDate } from '@education/contracts';
import { buildApp } from './app.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';
import { createStudyTime } from './study-time-application.js';

const { pool, household, learner, close } = familyFixtures();
const app = buildApp({ origin: fixtureOrigin, studyTime: createStudyTime(pool, 'Asia/Shanghai') });

afterAll(async () => {
  await app.close();
  await close();
});

const beat = (token: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/children/study-time',
    headers: { ...sessionHeaders(token), 'content-type': 'application/json' },
    payload: {},
  });

// A child of a family in Toronto whose last heartbeat was the given number of
// seconds ago.
async function studying(secondsAgo: number) {
  const parent = await household();
  await pool.query(`UPDATE families SET time_zone='America/Toronto' WHERE id=$1`, [parent.family]);
  const child = await learner(parent.family, '小鹿');
  await pool.query(
    `INSERT INTO study_beats(child_id,beat_at) VALUES($1,clock_timestamp()-$2*interval '1 second')`,
    [child.id, secondsAgo],
  );
  return { parent, child };
}

async function studyDays(childId: string) {
  const { rows } = await pool.query<{ date: string; seconds: number }>(
    `SELECT to_char(day,'YYYY-MM-DD') AS date,seconds FROM study_days WHERE child_id=$1 ORDER BY day`,
    [childId],
  );
  return rows;
}

const total = (days: { seconds: number }[]) => days.reduce((sum, day) => sum + day.seconds, 0);

it("adds the time since the last heartbeat to the family's local day", async () => {
  const { child } = await studying(30);
  const before = new Date();
  expect((await beat(child.token)).statusCode).toBe(204);
  const days = await studyDays(child.id);
  expect(total(days)).toBeGreaterThanOrEqual(30);
  expect(total(days)).toBeLessThan(33);
  expect(days.at(-1)!.date).toBe(localDate('America/Toronto', before));
});

it('counts two heartbeats sent at once only once', async () => {
  const { child } = await studying(30);
  const replies = await Promise.all([beat(child.token), beat(child.token)]);
  expect(replies.map(({ statusCode }) => statusCode)).toEqual([204, 204]);
  const counted = total(await studyDays(child.id));
  expect(counted).toBeGreaterThanOrEqual(30);
  expect(counted).toBeLessThan(33);
});

it('counts nothing after a stop longer than 90 seconds, then starts again', async () => {
  const { child } = await studying(120);
  expect((await beat(child.token)).statusCode).toBe(204);
  expect(await studyDays(child.id)).toEqual([]);
  const { rows } = await pool.query<{ fresh: boolean }>(
    `SELECT beat_at>clock_timestamp()-interval '10 seconds' AS fresh FROM study_beats WHERE child_id=$1`,
    [child.id],
  );
  expect(rows).toEqual([{ fresh: true }]);
});

it("takes heartbeats only from a signed-in child, never a parent's session", async () => {
  const { parent } = await studying(30);
  expect((await beat(parent.token)).statusCode).toBe(401);
  expect((await beat('b'.repeat(43))).statusCode).toBe(401);
});
