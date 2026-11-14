import { afterEach, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
const origin = 'https://education.example';
const headers = { origin, 'content-type': 'application/json', 'x-education-request': 'session' };
const token = 'a'.repeat(43);
const view = {
  role: 'parent' as const,
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only' as const,
  csrfToken: 'b'.repeat(43),
};
const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function setup() {
  const sessions = {
    login: vi.fn().mockResolvedValue({ token, view, maxAge: 900 }),
    current: vi.fn().mockResolvedValue(view),
    read: vi.fn().mockResolvedValue(view),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const app = buildApp({ origin, sessions });
  apps.push(app);
  const login = (custom = headers, body: object = { email: view.email, password: 'correct' }) =>
    app.inject({ method: 'POST', url: '/api/v1/parents/login', headers: custom, payload: body });
  return { app, sessions, login };
}
it('sets a host-only secure cookie but never returns the session token in JSON', async () => {
  const { login } = setup();
  const response = await login();
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(view);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['set-cookie']).toBe(
    `__Host-education_session=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900`,
  );
  expect(response.body).not.toContain(token);
});
it.each(['https://evil.example', 'null', ''])('rejects login CSRF from %s', async (bad) => {
  const { login, sessions } = setup();
  expect((await login({ ...headers, origin: bad })).statusCode).toBe(403);
  expect(sessions.login).not.toHaveBeenCalled();
});
it('rejects simple forms, missing custom headers, schema coercion and extra identity selectors', async () => {
  const { login, sessions } = setup();
  expect((await login({ ...headers, 'content-type': 'text/plain' })).statusCode).toBe(403);
  expect((await login({ ...headers, 'x-education-request': '' })).statusCode).toBe(403);
  expect((await login(headers, { email: 123, password: 'correct' })).statusCode).toBe(400);
  expect(
    (await login(headers, { email: view.email, password: 'correct', familyId: 'other' }))
      .statusCode,
  ).toBe(400);
  expect(sessions.login).not.toHaveBeenCalled();
});
it('reads only the cookie identity and refuses duplicate cookies and foreign query selectors', async () => {
  const { app, sessions } = setup();
  const response = await app.inject({
    url: '/api/v1/session',
    headers: { cookie: `__Host-education_session=${token}` },
  });
  expect(response.json()).toEqual(view);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(sessions.current).toHaveBeenLastCalledWith(token);
  expect((await app.inject({ url: '/api/v1/session?familyId=other' })).statusCode).toBe(400);
  await app.inject({
    url: '/api/v1/session',
    headers: { cookie: `__Host-education_session=${token}; __Host-education_session=another` },
  });
  expect(sessions.current).toHaveBeenLastCalledWith(undefined);
});
it('requires same-origin CSRF-protected POST to revoke, then clears cookie', async () => {
  const { app, sessions } = setup();
  const url = '/api/v1/parents/logout';
  expect(
    (
      await app.inject({
        method: 'POST',
        url,
        headers: { ...headers, origin: 'https://evil.example' },
        payload: {},
      })
    ).statusCode,
  ).toBe(403);
  expect(sessions.logout).not.toHaveBeenCalled();
  const response = await app.inject({
    method: 'POST',
    url,
    headers: {
      ...headers,
      cookie: `__Host-education_session=${token}`,
      'x-csrf-token': view.csrfToken,
    },
    payload: {},
  });
  expect(response.statusCode).toBe(204);
  expect(response.headers['set-cookie']).toContain('Max-Age=0');
  expect(sessions.logout).toHaveBeenCalledWith(token, view.csrfToken, '127.0.0.1');
});
it('returns limited and sanitized failures without setting a cookie', async () => {
  const { login, sessions } = setup();
  sessions.login.mockRejectedValueOnce(new RequestError(429, '尝试较多，请稍后再试。'));
  const limited = await login();
  expect(limited.statusCode).toBe(429);
  expect(limited.headers['retry-after']).toBe('60');
  sessions.login.mockRejectedValueOnce(new Error('private email and SQL'));
  const failed = await login();
  expect(failed.statusCode).toBe(503);
  expect(failed.body).not.toContain('SQL');
  expect(failed.headers['set-cookie']).toBeUndefined();
});
