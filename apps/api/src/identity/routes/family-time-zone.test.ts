import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyTimeZoneService } from '../services/family-time-zone.js';
import { csrfToken } from '../services/session-security.js';

const token = 'a'.repeat(43);
const origin = 'http://127.0.0.1:5173';
const cookie = `__Host-education_session=${token}`;
const sameSite = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
  cookie,
};
const parentPath = '/api/v1/parents/family/time-zone';

function setup() {
  const service = {
    read: vi.fn(async () => ({ timeZone: 'Asia/Shanghai', set: false })),
    change: vi.fn(async () => {}),
    forSession: vi.fn(async () => ({ timeZone: 'America/Toronto' })),
  } satisfies FamilyTimeZoneService;
  return { service, app: buildApp({ origin, familyTimeZone: service }) };
}

describe('family time zone routes', () => {
  it("reads the parent's setting uncached, with the session's credentials", async () => {
    const { app, service } = setup();
    const reply = await app.inject({ url: parentPath, headers: sameSite });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers.vary).toBe('Cookie');
    expect(reply.json()).toEqual({ timeZone: 'Asia/Shanghai', set: false });
    expect(service.read).toHaveBeenCalledWith({ token, csrf: csrfToken(token) });
  });

  it('saves a new zone and answers with no content', async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'PUT',
      url: parentPath,
      headers: sameSite,
      payload: { timeZone: 'America/Toronto' },
    });
    expect(reply.statusCode).toBe(204);
    expect(service.change).toHaveBeenCalledWith(
      { token, csrf: csrfToken(token) },
      { timeZone: 'America/Toronto' },
    );
  });

  it.each([{}, { timeZone: '' }, { timeZone: 8 }, { timeZone: 'UTC', family: 'other' }])(
    'turns away the body %j before the service',
    async (payload) => {
      const { app, service } = setup();
      const reply = await app.inject({
        method: 'PUT',
        url: parentPath,
        headers: sameSite,
        payload,
      });
      expect(reply.statusCode).toBe(400);
      expect(service.change).not.toHaveBeenCalled();
    },
  );

  it('refuses a change from another site', async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'PUT',
      url: parentPath,
      headers: { ...sameSite, origin: 'https://elsewhere.example' },
      payload: { timeZone: 'UTC' },
    });
    expect(reply.statusCode).toBe(403);
    expect(service.change).not.toHaveBeenCalled();
  });

  it("gives any signed-in member the family's zone by the session cookie alone", async () => {
    const { app, service } = setup();
    const reply = await app.inject({ url: '/api/v1/family/time-zone', headers: { cookie } });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.json()).toEqual({ timeZone: 'America/Toronto' });
    expect(service.forSession).toHaveBeenCalledWith(token);
  });

  it('passes on a session the service turns away', async () => {
    const { app, service } = setup();
    service.forSession.mockRejectedValue(new RequestError(401, '登录状态已失效，请重新登录。'));
    const reply = await app.inject({ url: '/api/v1/family/time-zone' });
    expect(reply.statusCode).toBe(401);
    expect(service.forSession).toHaveBeenCalledWith(undefined);
  });

  it('is unavailable without a database', async () => {
    const app = buildApp({ origin });
    expect((await app.inject({ url: parentPath, headers: sameSite })).statusCode).toBe(503);
    expect((await app.inject({ url: '/api/v1/family/time-zone' })).statusCode).toBe(503);
  });
});
