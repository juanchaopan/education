import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createFamilyTimeZone } from './family-time-zone-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';
import { tokenHash } from './identity/services/session-security.js';

const { pool, household, learner, close } = familyFixtures();
const app = buildApp({
  origin: fixtureOrigin,
  familyTimeZone: createFamilyTimeZone(pool, 'Asia/Shanghai'),
});
const path = '/api/v1/parents/family/time-zone';

afterAll(async () => {
  await app.close();
  await close();
});

const read = (token: string) => app.inject({ url: path, headers: sessionHeaders(token) });
const change = (token: string, timeZone: string, fill?: boolean) =>
  app.inject({
    method: 'PUT',
    url: path,
    headers: { ...sessionHeaders(token), 'content-type': 'application/json' },
    payload: fill === undefined ? { timeZone } : { timeZone, fill },
  });
const forSession = (token?: string) =>
  app.inject({
    url: '/api/v1/family/time-zone',
    headers: token ? { cookie: `__Host-education_session=${token}` } : {},
  });

it('counts a family without a zone in the default one until a parent sets its own', async () => {
  const parent = await household();
  expect((await read(parent.token)).json()).toEqual({ timeZone: 'Asia/Shanghai', set: false });
  const saved = await change(parent.token, 'america/toronto');
  expect(saved.statusCode).toBe(200);
  expect(saved.json()).toEqual({ timeZone: 'America/Toronto', set: true });
  expect((await read(parent.token)).json()).toEqual({ timeZone: 'America/Toronto', set: true });
  const stored = await pool.query('SELECT time_zone FROM families WHERE id=$1', [parent.family]);
  expect(stored.rows).toEqual([{ time_zone: 'America/Toronto' }]);
});

it("fills in a device's zone only while the family has none", async () => {
  const parent = await household();
  expect((await change(parent.token, 'Europe/London', true)).json()).toEqual({
    timeZone: 'Europe/London',
    set: true,
  });
  expect((await change(parent.token, 'America/Toronto', true)).json()).toEqual({
    timeZone: 'Europe/London',
    set: true,
  });
  expect((await change(parent.token, 'America/Toronto')).json()).toEqual({
    timeZone: 'America/Toronto',
    set: true,
  });
});

it("gives the parent and the children the family's zone, and nothing to anyone else", async () => {
  const parent = await household();
  const child = await learner(parent.family, '小鹿');
  const neighbour = await household();
  await change(neighbour.token, 'Europe/London');
  await change(parent.token, 'America/Toronto');
  expect((await forSession(parent.token)).json()).toEqual({ timeZone: 'America/Toronto' });
  expect((await forSession(child.token)).json()).toEqual({ timeZone: 'America/Toronto' });
  expect((await forSession(neighbour.token)).json()).toEqual({ timeZone: 'Europe/London' });
  expect((await forSession()).statusCode).toBe(401);
  expect((await forSession('b'.repeat(43))).statusCode).toBe(401);
});

it("reads the zone for a child's session without keeping the session alive", async () => {
  const parent = await household();
  const child = await learner(parent.family, '小兔');
  const seen = () =>
    pool.query('SELECT last_seen_at,expires_at FROM child_sessions WHERE token_hash=$1', [
      tokenHash(child.token),
    ]);
  const before = (await seen()).rows;
  expect((await forSession(child.token)).statusCode).toBe(200);
  expect((await seen()).rows).toEqual(before);
});

it('gives no zone to a session that has ended', async () => {
  const parent = await household();
  const child = await learner(parent.family, '小羊');
  await pool.query(
    `UPDATE child_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1`,
    [tokenHash(child.token)],
  );
  await pool.query(
    `UPDATE parent_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1`,
    [tokenHash(parent.token)],
  );
  expect((await forSession(child.token)).statusCode).toBe(401);
  expect((await forSession(parent.token)).statusCode).toBe(401);
});

it('keeps a zone it does not know out of the family', async () => {
  const parent = await household();
  expect((await change(parent.token, 'Mars/Olympus_Mons')).statusCode).toBe(400);
  expect((await read(parent.token)).json()).toEqual({ timeZone: 'Asia/Shanghai', set: false });
});

it('turns away a parent whose email is not verified', async () => {
  const unverified = await household(false);
  expect((await read(unverified.token)).statusCode).toBe(401);
  expect((await change(unverified.token, 'UTC')).statusCode).toBe(401);
  expect((await forSession(unverified.token)).statusCode).toBe(401);
});
