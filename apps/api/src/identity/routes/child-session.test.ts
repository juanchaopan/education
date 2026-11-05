import { expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';

const headers = {
  origin: 'https://education.example',
  'content-type': 'application/json',
  'x-education-request': 'session',
};
const payload = { familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿', pin: '018274' };
it('requires configured PIN authentication and strict same-origin JSON requests, never accepts selectors', async () => {
  const login = vi.fn();
  const service = { login, read: vi.fn(), logout: vi.fn() };
  const app = buildApp({ origin: headers.origin, childSessions: service });
  try {
    for (const origin of ['', 'null', 'https://evil.example']) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/children/login',
            headers: { ...headers, origin },
            payload,
          })
        ).statusCode,
      ).toBe(403);
    }
    for (const body of [
      { ...payload, familyId: 'other' },
      { ...payload, childId: 'other' },
      { ...payload, pin: '123' },
      { ...payload, pin: 18274 },
    ]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/children/login',
            headers,
            payload: body,
          })
        ).statusCode,
      ).toBe(400);
    }
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/children/login',
          headers: { ...headers, 'x-education-request': '' },
          payload,
        })
      ).statusCode,
    ).toBe(403);
    expect(login).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
  const unavailable = buildApp();
  try {
    expect((await unavailable.inject({ url: '/api/v1/children/session' })).statusCode).toBe(503);
  } finally {
    await unavailable.close();
  }
});
