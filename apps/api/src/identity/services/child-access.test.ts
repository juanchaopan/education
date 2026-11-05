import { expect, it, vi } from 'vitest';
import { createChildAccessService } from './child-access.js';
import { csrfToken } from './session-security.js';

const token = 'a'.repeat(43);
function fixture() {
  const repository = { list: vi.fn(), reset: vi.fn() };
  const read = vi.fn().mockResolvedValue({
    access: 'verified',
    email: 'test@example.test',
    csrfToken: csrfToken(token),
  });
  const hashPin = vi.fn().mockResolvedValue('protected-hash');
  const admit = vi.fn();
  return {
    repository,
    read,
    hashPin,
    admit,
    service: createChildAccessService({
      repository,
      sessions: { read },
      replacePin: hashPin,
      admit: (work, ...args) => {
        admit(work, ...args);
        return work();
      },
    }),
  };
}
const input = {
  childId: '00000000-0000-4000-8000-000000000001',
  credentialVersion: 1,
  pin: '018274',
};
it('authorizes verified parents with CSRF before admission or PIN hashing', async () => {
  const f = fixture();
  await expect(f.service.reset(token, 'wrong', input, 'ip')).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(f.admit).not.toHaveBeenCalled();
  f.read.mockResolvedValue({ access: 'pending-verification', csrfToken: csrfToken(token) });
  await expect(f.service.list(token, 'ip')).rejects.toMatchObject({ statusCode: 403 });
  expect(f.repository.list).not.toHaveBeenCalled();
});
it('uses the shared PIN policy and separate parent recovery admission, passing identity-bound hashing to the transaction', async () => {
  const f = fixture();
  await expect(
    f.service.reset(token, csrfToken(token), { ...input, pin: '123456' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(f.repository.reset).not.toHaveBeenCalled();
  await f.service.reset(token, csrfToken(token), input, 'ip');
  expect(f.admit).toHaveBeenCalledWith(
    expect.any(Function),
    'test@example.test',
    'ip',
    'child-reset',
  );
  const hash = f.repository.reset.mock.calls[0]![2];
  await hash('family', input.childId, 'old-hash');
  expect(f.hashPin).toHaveBeenCalledWith('family', input.childId, '018274', 'old-hash');
});
