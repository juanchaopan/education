import { expect, it, vi } from 'vitest';
import { createRegistrationKeyService, generateRegistrationKey } from './registration-key.js';
import { tokenHash, csrfToken } from './session-security.js';
const token = 'a'.repeat(43);
function setup(access = 'verified') {
  const sessions = { read: vi.fn().mockResolvedValue({ access, csrfToken: csrfToken(token) }) };
  const repository = {
    read: vi.fn().mockResolvedValue({ key: null, reauthenticationRequired: false }),
    generate: vi
      .fn()
      .mockResolvedValue({ id: 'key-id', status: 'active', expiresAt: '2030-01-01T00:00:00.000Z' }),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  return { sessions, repository, service: createRegistrationKeyService({ sessions, repository }) };
}
it('generates unambiguous 80-bit keys, hashes before persistence and only returns raw text on generation', async () => {
  const keys = new Set(Array.from({ length: 500 }, generateRegistrationKey));
  expect(keys.size).toBe(500);
  for (const key of keys)
    expect(key).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
  const { service, repository } = setup();
  const result = await service.generate(token, csrfToken(token), 'ip');
  expect(repository.generate).toHaveBeenCalledWith(
    tokenHash(token),
    tokenHash(result.value.replaceAll('-', '')),
  );
  expect(JSON.stringify(await service.read(token, 'ip'))).not.toContain(result.value);
});
it('requires a verified session and a cookie-bound CSRF token before writes', async () => {
  const f = setup();
  await expect(f.service.generate(token, 'wrong', 'ip')).rejects.toMatchObject({ statusCode: 403 });
  expect(f.repository.generate).not.toHaveBeenCalled();
  const pending = setup('verification-only');
  await expect(pending.service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 403 });
  expect(pending.repository.read).not.toHaveBeenCalled();
  await f.service.revoke(token, csrfToken(token), 'key-id', 'ip');
  expect(f.repository.revoke).toHaveBeenCalledWith(tokenHash(token), 'key-id');
});
