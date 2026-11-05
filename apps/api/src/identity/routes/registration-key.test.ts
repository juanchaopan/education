import { expect, it, vi } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { GeneratedRegistrationKey, RegistrationKeyStatus } from '@education/contracts';
import { buildApp } from '../../app.js';
import { createRegistrationKeyService } from '../services/registration-key.js';
import { csrfToken } from '../services/session-security.js';

it('shares response validation between browser and server and rejects extra response fields', () => {
  const key = {
    id: 'bb51e85f-1306-4bcd-9811-35e27c6e9638',
    status: 'active',
    expiresAt: '2030-01-01T00:00:00.000Z',
  };
  expect(Value.Check(GeneratedRegistrationKey, { key, value: 'ABCD-EFGH-JKMN-PQRS' })).toBe(true);
  expect(Value.Check(RegistrationKeyStatus, { key, reauthenticationRequired: false })).toBe(true);
  expect(
    Value.Check(RegistrationKeyStatus, {
      key: { ...key, keyHash: 'private' },
      reauthenticationRequired: false,
    }),
  ).toBe(false);
  expect(Value.Check(GeneratedRegistrationKey, { key, value: 'ILOU-not-a-valid-key' })).toBe(false);
});
it('keeps raw keys and passwords out of structured error events, redirects and cacheable GETs', async () => {
  const token = 'a'.repeat(43);
  const sessions = {
    read: vi.fn().mockResolvedValue({ access: 'verified', csrfToken: csrfToken(token) }),
  };
  const repository = {
    read: vi.fn(),
    revoke: vi.fn(),
    generate: vi.fn().mockRejectedValue(new Error('private-key-value private-password-value')),
  };
  const app = buildApp({
    registrationKeys: createRegistrationKeyService({ sessions, repository }),
  });
  const logs: unknown[] = [];
  app.addHook('onRequest', async (request) => {
    vi.spyOn(request.log, 'error').mockImplementation((...args: unknown[]) => {
      logs.push(args);
    });
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/registration-keys',
      headers: {
        origin: 'http://127.0.0.1:5173',
        'content-type': 'application/json',
        'x-education-request': 'session',
        'x-csrf-token': csrfToken(token),
        cookie: `__Host-education_session=${token}`,
      },
      payload: {},
    });
    expect(response.statusCode).toBe(503);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.location).toBeUndefined();
    expect(repository.generate).toHaveBeenCalledOnce();
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toMatch(/private-key-value|private-password-value/);
    expect(response.body).not.toMatch(/private-key-value|private-password-value/);
    expect((await app.inject('/api/v1/parents/registration-keys/revoke')).statusCode).toBe(404);
  } finally {
    await app.close();
  }
});
