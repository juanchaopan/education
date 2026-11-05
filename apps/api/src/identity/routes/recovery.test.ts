import { expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
const origin = 'https://school.example';
const headers = { origin, 'content-type': 'application/json', 'x-education-request': 'session' };
it('requires same-origin JSON writes, validates bodies, disables cache and never authenticates from a reset link', async () => {
  const recovery = {
    request: vi.fn().mockResolvedValue({ status: 'requested' }),
    reset: vi.fn().mockResolvedValue({ status: 'reset' }),
  };
  const app = buildApp({ origin, recovery });
  try {
    for (const method of ['GET', 'HEAD'] as const)
      expect(
        (await app.inject({ method, url: '/api/v1/parents/recovery/confirm' })).statusCode,
      ).toBe(404);
    const payload = { email: 'parent@example.test', action: 'send' };
    for (const custom of [
      { ...headers, origin: 'https://evil.example' },
      { ...headers, 'x-education-request': '' },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/parents/recovery',
            headers: custom,
            payload,
          })
        ).statusCode,
      ).toBe(403);
    expect(recovery.request).not.toHaveBeenCalled();
    const request = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/recovery',
      headers,
      payload,
    });
    expect(request.json()).toEqual({ status: 'requested' });
    expect(request.headers['cache-control']).toBe('no-store');
    expect(request.headers['set-cookie']).toBeUndefined();
    const confirm = { token: 'b'.repeat(43), password: 'a new private test phrase' };
    for (const body of [
      { ...confirm, email: 'other@example.test' },
      { ...confirm, token: 'invalid' },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/parents/recovery/confirm',
            headers,
            payload: body,
          })
        ).statusCode,
      ).toBe(400);
    expect(recovery.reset).not.toHaveBeenCalled();
    const result = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/recovery/confirm',
      headers,
      payload: confirm,
    });
    expect(result.json()).toEqual({ status: 'reset' });
    expect(result.headers['set-cookie']).toContain('Max-Age=0');
    expect(result.headers['set-cookie']).toContain('Secure; HttpOnly; SameSite=Lax');
  } finally {
    await app.close();
  }
});
it('fails closed when mail is disabled', async () => {
  const app = buildApp({ origin });
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/parents/recovery',
          headers,
          payload: { email: 'parent@example.test', action: 'send' },
        })
      ).statusCode,
    ).toBe(503);
  } finally {
    await app.close();
  }
});
