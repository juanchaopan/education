import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../app.js';

it('rejects cross-origin, extra identity selectors, malformed input and GET mutation; never issues a session', async () => {
  const childRegistration = vi
    .fn()
    .mockResolvedValue({ status: 'registered', familyCode: 'ABCD-EFGH-JKMN', nickname: '小明' });
  const app = buildApp({ origin: 'https://school.test', childRegistration });
  const headers = { origin: 'https://school.test', 'x-education-request': 'child-registration' };
  const payload = {
    requestId: randomUUID(),
    key: 'ABCD-EFGH-JKMN-PQRS',
    nickname: '小明',
    pin: '018274',
  };
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/children/register',
          headers: { ...headers, origin: 'https://evil.test' },
          payload,
        })
      ).statusCode,
    ).toBe(403);
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/children/register',
      headers,
      payload: { ...payload, familyId: randomUUID() },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toContain('六位');
    expect(childRegistration).not.toHaveBeenCalled();
    const result = await app.inject({
      method: 'POST',
      url: '/api/v1/children/register',
      headers,
      payload,
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(result.body).not.toContain(payload.pin);
    expect((await app.inject({ url: '/api/v1/children/register' })).statusCode).toBe(404);
  } finally {
    await app.close();
  }
});
