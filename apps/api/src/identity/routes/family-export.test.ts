import { describe, expect, it, vi } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { FamilyExport } from '@education/contracts';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyExportService } from '../services/family-export.js';
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

const file: FamilyExport = {
  format: {
    name: 'education-family-export',
    version: 2,
    generatedAt: '2026-11-07T12:00:00.000Z',
    includes: ['孩子的昵称'],
    excludes: ['密码和 PIN 的哈希'],
  },
  parent: { email: 'parent@example.test', emailVerified: true },
  aiConsents: [],
  children: [{ nickname: '小鹿', learning: [], books: [], drafts: [] }],
};

function exportWith(service?: FamilyExportService, headers: Record<string, string> = sameSite) {
  return buildApp({ origin, familyExport: service }).inject({
    method: 'POST',
    url: '/api/v1/parents/family-export',
    headers,
    payload: {},
  });
}

describe('family export route', () => {
  it('sends an uncached attachment with only the fields the contract declares', async () => {
    const leaky = {
      ...file,
      parent: { ...file.parent, passwordHash: 'private-password-hash' },
      children: [{ ...file.children[0]!, pinHash: 'private-pin-hash', id: 'child-id' }],
    };
    const service = vi.fn().mockResolvedValue(leaky);
    const response = await exportWith(service);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.vary).toBe('Cookie');
    expect(response.headers['content-disposition']).toBe('attachment; filename="family-data.json"');
    expect(service).toHaveBeenCalledWith({ token, csrf: csrfToken(token) });
    expect(response.json()).toEqual(file);
    expect(Value.Check(FamilyExport, response.json())).toBe(true);
    expect(response.body).not.toMatch(/private-|child-id/);
  });

  it('refuses a request from another site before reading the family', async () => {
    const service = vi.fn().mockResolvedValue(file);
    const response = await exportWith(service, { ...sameSite, origin: 'https://other.example' });
    expect(response.statusCode).toBe(403);
    expect(service).not.toHaveBeenCalled();
  });

  it('answers a refusal or an unconfigured service as an uncached message, not a file', async () => {
    const refused = vi.fn().mockRejectedValue(new RequestError(403, '请重新确认家长密码。'));
    for (const response of [await exportWith(refused), await exportWith()]) {
      expect([403, 503]).toContain(response.statusCode);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-disposition']).toBeUndefined();
      expect(response.json()).toEqual({ message: expect.any(String) });
    }
  });
});
