import { expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
const origin = 'https://education.example';
const csrf = 'a'.repeat(43);
const view = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only',
  csrfToken: csrf,
};
function fixture() {
  const sessions = {
    current: vi.fn(),
    read: vi.fn().mockResolvedValue(view),
    login: vi.fn(),
    logout: vi.fn(),
  };
  const status = { enabled: true, status: 'accepted', retryAfter: 60, canRetry: false };
  const verification = {
    status: vi.fn().mockResolvedValue(status),
    send: vi.fn().mockResolvedValue('accepted'),
    consume: vi.fn().mockResolvedValue({ status: 'verified' }),
  };
  return { app: buildApp({ origin, sessions, verification }), verification, sessions };
}
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': csrf,
};
it('requires an authenticated session and CSRF for sending and never accepts a supplied recipient', async () => {
  const { app, verification, sessions } = fixture();
  const send = (body: object, custom = headers) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/parents/verification',
      headers: custom,
      payload: body,
    });
  expect((await send({ action: 'send' })).statusCode).toBe(200);
  expect(verification.send).toHaveBeenCalledWith(view.email, 'send');
  expect((await send({ action: 'send', email: 'other@example.test' })).statusCode).toBe(400);
  expect(
    (await send({ action: 'send' }, { ...headers, origin: 'https://evil.example' })).statusCode,
  ).toBe(403);
  expect((await send({ action: 'send' }, { ...headers, 'x-csrf-token': 'wrong' })).statusCode).toBe(
    403,
  );
  sessions.read.mockRejectedValueOnce(new Error('unavailable'));
  expect((await send({ action: 'send' })).statusCode).toBe(503);
  expect(verification.send).toHaveBeenCalledOnce();
  await app.close();
});
it('does not confirm on GET/HEAD or malformed/cross-site POST; the explicit POST cannot issue a login cookie', async () => {
  const { app, verification } = fixture();
  const url = '/api/v1/parents/verification/confirm';
  for (const method of ['GET', 'HEAD'] as const)
    expect((await app.inject({ method, url })).statusCode).toBe(404);
  expect(verification.consume).not.toHaveBeenCalled();
  expect(
    (await app.inject({ method: 'POST', url, headers, payload: { token: 'invalid' } })).statusCode,
  ).toBe(400);
  const result = await app.inject({
    method: 'POST',
    url,
    headers,
    payload: { token: 'b'.repeat(43) },
  });
  expect(result.statusCode).toBe(200);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers['set-cookie']).toBeUndefined();
  expect(verification.consume).toHaveBeenCalledWith('b'.repeat(43), expect.any(String));
  await app.close();
});
