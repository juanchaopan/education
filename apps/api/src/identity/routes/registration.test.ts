import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';

const origin = 'https://education.example';
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'registration',
};
const input = { email: 'parent@example.com', password: 'a private phrase for exploring together' };
const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function setup() {
  const submit = vi.fn().mockResolvedValue({ status: 'pending-verification', mail: 'not-sent' });
  const app = buildApp({ origin, registration: submit });
  apps.push(app);
  const send = (payload: string | object = input, custom = headers) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/parents/register',
      headers: custom,
      payload,
    });
  return { app, submit, send };
}

describe('registration HTTP boundary', () => {
  it('returns a private receipt without granting permissions', async () => {
    const { app, send } = setup();
    const result = await send();
    expect(result.statusCode).toBe(202);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(result.json()).toEqual({ status: 'pending-verification', mail: 'not-sent' });
    expect(
      (await app.inject({ method: 'POST', url: '/api/v1/registration-keys' })).statusCode,
    ).toBe(404);
  });
  it.each(['https://other.example', 'null', ''])(
    'rejects untrusted origin %s before processing',
    async (bad) => {
      const { submit, send } = setup();
      expect((await send(input, { ...headers, origin: bad })).statusCode).toBe(403);
      expect(submit).not.toHaveBeenCalled();
    },
  );
  it('rejects missing headers and simple forms', async () => {
    const { send, submit } = setup();
    expect((await send(input, { ...headers, 'x-education-request': '' })).statusCode).toBe(403);
    expect(
      (await send('email=x', { ...headers, 'content-type': 'application/x-www-form-urlencoded' }))
        .statusCode,
    ).toBe(403);
    expect(submit).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, familyId: 'untrusted' },
    { email: 123, password: input.password },
    { ...input, password: 'short' },
  ])('rejects invalid schemas without coercion', async (payload) => {
    const { send, submit } = setup();
    expect((await send(payload)).statusCode).toBe(400);
    expect(submit).not.toHaveBeenCalled();
  });
  it('returns generic failure without leaking SQL, email, or password', async () => {
    const { send, submit } = setup();
    submit.mockRejectedValue(new Error('private SQL with parent@example.com'));
    const response = await send();
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('parent@example.com');
    expect(response.body).not.toContain('SQL');
  });
});
