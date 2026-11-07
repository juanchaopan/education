import { describe, expect, it, vi } from 'vitest';
import { familyDeletionPhrase } from '@education/contracts';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyDeletionService } from '../services/family-deletion.js';
import { csrfToken } from '../services/session-security.js';

const token = 'a'.repeat(43);
const origin = 'http://127.0.0.1:5173';
const sameSite = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
  cookie: `__Host-education_session=${token}`,
};

// The outcome is produced only when the route asks for it, so a refusal is
// never a rejected promise that nothing is waiting on.
function deletion(outcome: () => ReturnType<FamilyDeletionService['delete']>) {
  return { delete: vi.fn(outcome), completePending: vi.fn() } as FamilyDeletionService;
}

function deleteWith(
  service?: FamilyDeletionService,
  headers: Record<string, string> = sameSite,
  payload: unknown = { confirmation: familyDeletionPhrase },
) {
  return buildApp({ origin, familyDeletion: service }).inject({
    method: 'POST',
    url: '/api/v1/parents/family-deletion',
    headers,
    payload: payload as object,
  });
}

describe('family deletion route', () => {
  it('clears the session cookie once the family is deleted', async () => {
    const service = deletion(async () => ({ status: 'deleted' }));
    const response = await deleteWith(service);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'deleted' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']).toContain('Max-Age=0');
    expect(service.delete).toHaveBeenCalledWith(
      { token, csrf: csrfToken(token) },
      { confirmation: familyDeletionPhrase },
    );
  });

  it('answers a pending deletion as accepted and keeps the session', async () => {
    const response = await deleteWith(deletion(async () => ({ status: 'pending' })));
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'pending' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('refuses another site or an unexpected body before deleting anything', async () => {
    const service = deletion(async () => ({ status: 'deleted' }));
    for (const response of [
      await deleteWith(service, { ...sameSite, origin: 'https://other.example' }),
      await deleteWith(service, sameSite, { confirmation: familyDeletionPhrase, family: 'x' }),
      await deleteWith(service, sameSite, {}),
    ])
      expect([400, 403]).toContain(response.statusCode);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('answers a refusal or an unconfigured service without touching the cookie', async () => {
    const refused = deletion(async () => {
      throw new RequestError(403, '请重新确认家长密码。');
    });
    for (const response of [await deleteWith(refused), await deleteWith()]) {
      expect([403, 503]).toContain(response.statusCode);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.json()).toEqual({ message: expect.any(String) });
    }
  });
});
