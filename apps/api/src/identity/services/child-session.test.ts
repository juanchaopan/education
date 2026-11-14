import { expect, it, vi } from 'vitest';
import type { AuthAdmission } from '../domain/authentication.js';
import { createChildSessionService } from './child-session.js';

const account = {
  id: 'child-a',
  familyId: 'family-a',
  nickname: '小鹿',
  pinHash: 'stored',
  pinPepperVersion: 1,
  credentialVersion: 1,
  familyEpoch: 1,
};
function setup() {
  const repository = {
    find: vi.fn().mockResolvedValue(account),
    issue: vi.fn().mockResolvedValue(true),
    read: vi.fn().mockResolvedValue({ nickname: '小鹿' }),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  const verify = vi.fn().mockResolvedValue(true);
  const calls: unknown[][] = [];
  const admit: AuthAdmission = async (work, ...args) => {
    calls.push([work, ...args]);
    return work();
  };
  const material = vi.fn(
    (family: string, child: string, pin: string) => `${family}:${child}:${pin}`,
  );
  const service = createChildSessionService({
    repository,
    verify,
    admit,
    material,
    dummyHash: 'dummy',
  });
  const input = { familyCode: ' abcd-efgh-jkmn ', nickname: ' Ａ鹿 ', pin: '018274' };
  return { repository, verify, calls, material, service, input };
}
it('normalizes the locator, verifies identity-bound PIN material, rotates tokens and grants child access only', async () => {
  const { service, input, repository, verify, calls } = setup();
  const result = await service.login(input, 'source', 'x'.repeat(43));
  expect(repository.find).toHaveBeenCalledWith('ABCDEFGHJKMN', 'a鹿');
  expect(verify).toHaveBeenCalledWith('stored', 'family-a:child-a:018274');
  expect(calls[0]).toEqual([
    expect.any(Function),
    JSON.stringify(['ABCDEFGHJKMN', 'a鹿']),
    'source',
    'child-login',
    'ABCDEFGHJKMN',
  ]);
  expect(result.view).toEqual({ role: 'child', nickname: '小鹿', csrfToken: expect.any(String) });
  expect(result.maxAge).toBe(180 * 86400);
  expect(result.token).toMatch(/^[\w-]{43}$/);
  expect(JSON.stringify(repository.issue.mock.calls)).not.toContain(result.token);
});
it('uses dummy verification and identical denial for unknown family, nickname, legacy pepper and wrong PIN', async () => {
  const { service, input, repository, verify } = setup();
  for (const found of [undefined, { ...account, pinPepperVersion: null }]) {
    repository.find.mockResolvedValueOnce(found);
    await expect(service.login(input, 'source')).rejects.toMatchObject({ statusCode: 401 });
    expect(verify).toHaveBeenLastCalledWith('dummy', expect.any(String));
  }
  verify.mockResolvedValueOnce(false);
  await expect(service.login(input, 'source')).rejects.toMatchObject({ statusCode: 401 });
  expect(repository.issue).not.toHaveBeenCalled();
});
it('does not issue a session if the PIN or family epoch changes during hashing', async () => {
  const { service, input, repository } = setup();
  repository.issue.mockResolvedValueOnce(false);
  await expect(service.login(input, 'source')).rejects.toMatchObject({ statusCode: 401 });
});
it('requires valid live tokens and CSRF, revokes logout, and propagates database unavailability', async () => {
  const { service, input, repository } = setup();
  const { token, view } = await service.login(input, 'source');
  await expect(service.logout(token, 'wrong')).rejects.toMatchObject({ statusCode: 403 });
  expect(repository.revoke).not.toHaveBeenCalled();
  await service.logout(token, view.csrfToken);
  expect(repository.revoke).toHaveBeenCalledOnce();
  repository.read.mockResolvedValueOnce(undefined);
  await expect(service.read(token)).rejects.toMatchObject({ statusCode: 401 });
  await expect(service.read(undefined)).rejects.toMatchObject({ statusCode: 401 });
  repository.read.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(service.read(token)).rejects.toThrow('database unavailable');
});
it('reads the session and logs out without spending the login budgets', async () => {
  const { service, repository, calls } = setup();
  repository.read.mockResolvedValue(undefined);
  for (const token of [undefined, 'short', 'x'.repeat(43)]) {
    await expect(service.read(token)).rejects.toMatchObject({ statusCode: 401 });
    await expect(service.logout(token, 'x'.repeat(43))).rejects.toMatchObject({ statusCode: 401 });
  }
  expect(calls).toEqual([]);
});
