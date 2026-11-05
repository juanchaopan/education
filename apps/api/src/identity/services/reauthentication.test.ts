import { expect, it, vi } from 'vitest';
import { createReauthenticationService } from './reauthentication.js';
import { csrfToken, tokenHash } from './session-security.js';
const token = 'a'.repeat(43);
function setup() {
  const account = { passwordHash: 'hash', email: 'parent@example.test' };
  const sessions = {
    read: vi
      .fn()
      .mockResolvedValue({ ...account, access: 'verified', csrfToken: csrfToken(token) }),
  };
  const repository = {
    find: vi.fn().mockResolvedValue(account),
    confirm: vi.fn().mockResolvedValue(300),
  };
  const verify = vi.fn().mockResolvedValue(true);
  const admission = vi.fn();
  const admit = async <T>(work: () => Promise<T>, email: string, source: string) => {
    admission(work, email, source);
    return work();
  };
  const service = createReauthenticationService({ sessions, repository, verify, admit });
  return { service, repository, verify, admit: admission };
}
it('checks the password with admission, rotates the cookie and never extends its absolute lifetime', async () => {
  const f = setup();
  const result = await f.service.confirm(token, csrfToken(token), ' exact password ', 'source');
  expect(f.verify).toHaveBeenCalledWith('hash', ' exact password ');
  expect(result.token).not.toBe(token);
  expect(result.maxAge).toBe(300);
  expect(f.repository.confirm).toHaveBeenCalledWith(
    expect.any(Object),
    tokenHash(token),
    tokenHash(result.token),
  );
  expect(f.admit).toHaveBeenCalledWith(expect.any(Function), 'parent@example.test', 'source');
});
it('refuses wrong passwords, stale snapshots and invalid CSRF before granting recent authentication', async () => {
  const f = setup();
  await expect(f.service.confirm(token, 'wrong', 'password', 'ip')).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(f.verify).not.toHaveBeenCalled();
  f.verify.mockResolvedValueOnce(false);
  await expect(f.service.confirm(token, csrfToken(token), 'wrong', 'ip')).rejects.toMatchObject({
    statusCode: 401,
  });
  expect(f.repository.confirm).not.toHaveBeenCalled();
  f.repository.confirm.mockResolvedValueOnce(undefined);
  await expect(f.service.confirm(token, csrfToken(token), 'correct', 'ip')).rejects.toMatchObject({
    statusCode: 401,
  });
});
