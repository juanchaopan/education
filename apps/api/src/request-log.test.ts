import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { RequestError } from './shared/request-error.js';

const origin = 'https://education.example';
const pin = '583920';
const key = 'SYNTHKEY-7Q4M-9X2P';
const password = 'synthetic parent password 4471';
const session = 'synthetic-session-token-8812';
const childText = '我觉得答案是十七个';
const drawing = 'U1lOVEhFVElDRFJBV0lORw==';
const secrets = [pin, key, password, session, childText, drawing, 'postgres://'];

type Line = Record<string, unknown> & { msg: string; level: number };
const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function logged(options: Parameters<typeof buildApp>[0] = {}) {
  const lines: string[] = [];
  const app = buildApp({ origin, ...options, logStream: { write: (line) => lines.push(line) } });
  apps.push(app);
  const completed = () =>
    lines.map((line) => JSON.parse(line) as Line).filter(({ msg }) => msg === 'Request completed');
  return { app, text: () => lines.join(''), completed };
}

const childHeaders = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': 'synthetic-csrf',
  cookie: `__Host-education_session=${session}`,
  authorization: `Bearer ${session}`,
};
const childLogin = {
  method: 'POST',
  url: '/api/v1/children/login',
  headers: childHeaders,
  payload: { familyCode: 'FAMILY01', nickname: '小鹿', pin },
} as const;

describe('request log', () => {
  it('records one line per request with its request ID, route, status and time', async () => {
    const { app, completed } = logged();
    const response = await app.inject('/api/v1/problems');
    const id = response.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(completed()).toHaveLength(1);
    expect(completed()[0]).toMatchObject({
      level: 30,
      requestId: id,
      method: 'GET',
      route: '/api/v1/problems',
      status: 200,
      outcome: 'ok',
      durationMs: expect.any(Number),
    });
    const second = await app.inject('/api/v1/problems');
    expect(second.headers['x-request-id']).not.toBe(id);
  });

  it('logs the route pattern, never the URL with its token or query', async () => {
    const { app, completed, text } = logged();
    const response = await app.inject({
      url: `/api/v1/parents/verification?token=${session}`,
      headers: childHeaders,
    });
    expect(response.statusCode).toBe(400);
    expect(completed()[0]).toMatchObject({
      route: '/api/v1/parents/verification',
      outcome: 'client-error',
      code: 'FST_ERR_VALIDATION',
    });
    for (const secret of secrets) expect(text()).not.toContain(secret);
  });

  it('classifies a database failure by its code and keeps the message out', async () => {
    const failure = Object.assign(
      new Error(`duplicate key ${key} ${pin} at postgres://user:${password}@db`),
      { code: '23505' },
    );
    const { app, completed, text } = logged({
      childRegistration: (async () => {
        throw failure;
      }) as never,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/children/register',
      headers: { ...childHeaders, 'x-education-request': 'child-registration' },
      payload: { requestId: crypto.randomUUID(), key, nickname: '小鹿', pin },
    });
    expect(response.statusCode).toBe(503);
    expect(completed()[0]).toMatchObject({
      level: 50,
      route: '/api/v1/children/register',
      status: 503,
      outcome: 'database',
      code: '23505',
    });
    for (const secret of secrets) expect(text()).not.toContain(secret);
  });

  it.each([
    [Object.assign(new Error('connect ECONNREFUSED postgres://db'), { code: 'ECONNREFUSED' })],
    [new Error('timeout exceeded when trying to connect')],
  ])('counts a connection failure during sign-in as a database failure', async (failure) => {
    const { app, completed, text } = logged({
      childSessions: {
        login: async () => {
          throw failure;
        },
      } as never,
    });
    expect((await app.inject(childLogin)).statusCode).toBe(503);
    expect(completed()[0]).toMatchObject({ outcome: 'database' });
    for (const secret of secrets) expect(text()).not.toContain(secret);
  });

  it('separates rate limits, unconfigured services and unexpected errors', async () => {
    const { app, completed, text } = logged({
      childSessions: {
        login: async () => {
          throw new RequestError(429, '尝试次数过多');
        },
      } as never,
      registration: (async () => {
        throw new TypeError(`cannot read ${password}`);
      }) as never,
    });
    await app.inject(childLogin);
    await app.inject({
      method: 'POST',
      url: '/api/v1/problems/count-dots/1/feedback',
      headers: childHeaders,
      payload: { stepId: 'count-left', text: childText },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/parents/register',
      headers: { ...childHeaders, 'x-education-request': 'registration' },
      payload: { email: 'parent@example.test', password },
    });
    expect(completed().map(({ outcome, level }) => [outcome, level])).toEqual([
      ['rate-limited', 40],
      ['unavailable', 50],
      ['server-error', 50],
    ]);
    expect(completed()[2]).toMatchObject({ code: 'UNKNOWN' });
    for (const secret of secrets) expect(text()).not.toContain(secret);
  });

  it('tells a service closed for maintenance from a database that cannot be reached', async () => {
    const closed = logged({ ready: async () => false });
    expect((await closed.app.inject('/api/v1/problems')).statusCode).toBe(503);
    expect((await closed.app.inject('/health/ready')).statusCode).toBe(503);
    expect(closed.completed().map(({ outcome }) => outcome)).toEqual([
      'maintenance',
      'unavailable',
    ]);
    const down = logged({
      ready: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED postgres://db'), {
          code: 'ECONNREFUSED',
        });
      },
    });
    expect((await down.app.inject('/api/v1/problems')).statusCode).toBe(503);
    expect((await down.app.inject('/health/ready')).statusCode).toBe(503);
    expect(down.completed()).toEqual([
      expect.objectContaining({ outcome: 'database', code: 'ECONNREFUSED', level: 50 }),
      expect.objectContaining({ outcome: 'database', code: 'ECONNREFUSED', level: 50 }),
    ]);
    expect(down.text()).not.toContain('postgres://');
  });

  it('records how an AI request ended without the child text or drawing', async () => {
    const { app, completed, text } = logged({
      teachingFeedback: async () => ({ status: 'fallback', reason: 'missing-key' }) as never,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/problems/count-dots/1/feedback',
      headers: childHeaders,
      payload: { stepId: 'count-left', text: childText, image: drawing },
    });
    expect(response.statusCode).toBe(200);
    expect(completed()[0]).toMatchObject({
      route: '/api/v1/problems/:id/:version/feedback',
      outcome: 'ok',
      ai: { resource: 'feedback', status: 'fallback', reason: 'missing-key' },
    });
    for (const secret of secrets) expect(text()).not.toContain(secret);
  });
});
