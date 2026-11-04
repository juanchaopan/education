import { expect, it, vi } from 'vitest';
import { createSessionService } from './session.js';

const account = {
  id: 'parent-a',
  familyId: 'family-a',
  email: 'a@example.test',
  passwordHash: 'stored-hash',
  credentialVersion: 1,
  familyEpoch: 1,
  emailVerified: false,
};
function setup() {
  const repository = {
    find: vi.fn().mockResolvedValue(account),
    issue: vi.fn().mockResolvedValue(true),
    read: vi.fn().mockResolvedValue({ ...account, access: 'verification-only' }),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  const verify = vi.fn().mockResolvedValue(true);
  const admit = async <T>(work: () => Promise<T>) => work();
  const service = createSessionService({ repository, verify, admit, dummyHash: 'dummy-hash' });
  return { repository, verify, admit, service };
}
it('normalizes only email, rotates the token, and stores only a token hash', async () => {
  const { service, repository, verify } = setup();
  const result = await service.login(
    { email: ' A@EXAMPLE.TEST ', password: '  exact password  ' },
    'ip',
    'x'.repeat(43),
  );
  expect(repository.find).toHaveBeenCalledWith('a@example.test');
  expect(verify).toHaveBeenCalledWith('stored-hash', '  exact password  ');
  expect(result.token).toMatch(/^[\w-]{43}$/);
  expect(result.token).not.toBe('x'.repeat(43));
  expect(JSON.stringify(repository.issue.mock.calls)).not.toContain(result.token);
  expect(result.view.access).toBe('verification-only');
  expect(result.maxAge).toBe(900);
});
it('uses a same-tier dummy verification and the same error for unknown or wrong credentials', async () => {
  const { service, repository, verify } = setup();
  repository.find.mockResolvedValueOnce(undefined);
  await expect(
    service.login({ email: 'missing@example.test', password: 'wrong' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 401 });
  expect(verify).toHaveBeenLastCalledWith('dummy-hash', 'wrong');
  verify.mockResolvedValueOnce(false);
  await expect(
    service.login({ email: 'a@example.test', password: 'wrong' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 401 });
  expect(repository.issue).not.toHaveBeenCalled();
});
it('does not issue when credentials change during hashing', async () => {
  const { service, repository } = setup();
  repository.issue.mockResolvedValueOnce(false);
  await expect(
    service.login({ email: 'a@example.test', password: 'correct' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 401 });
});
it('binds CSRF to the cookie and refuses missing, expired, and revoked sessions', async () => {
  const { service, repository } = setup();
  const { token, view } = await service.login(
    { email: 'a@example.test', password: 'correct' },
    'ip',
  );
  await expect(service.logout(token, 'wrong', 'ip')).rejects.toMatchObject({ statusCode: 403 });
  expect(repository.revoke).not.toHaveBeenCalled();
  await service.logout(token, view.csrfToken, 'ip');
  expect(repository.revoke).toHaveBeenCalledOnce();
  repository.read.mockResolvedValue(undefined);
  await expect(service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
  await expect(service.read(undefined, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
