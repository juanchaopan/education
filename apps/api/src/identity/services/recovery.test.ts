import type { VerificationDraft } from '../repositories/verification.js';
import type { RecoveryRequest } from '@education/contracts';
import { expect, it, vi } from 'vitest';
import { createRecoveryService } from './recovery.js';
import { createMailPayload } from '../../shared/mail-payload.js';
function fixture(found = true, realWait = false) {
  const reserve = vi.fn(
    async (_email: string, _action: RecoveryRequest['action'], draft: VerificationDraft) =>
      found ? { ...draft, email: 'parent@example.test' } : undefined,
  );
  const repository = { reserve, finish: vi.fn(), consume: vi.fn().mockResolvedValue(true) };
  const sender = { send: vi.fn().mockResolvedValue('accepted') };
  const wait = vi.fn().mockResolvedValue(undefined);
  const admit = async <T>(work: () => Promise<T>) => work();
  const hash = vi.fn().mockResolvedValue('new-password-hash');
  const service = createRecoveryService({
    repository,
    sender,
    admit,
    hash,
    payload: createMailPayload('a'.repeat(64)),
    wait: realWait ? undefined : wait,
  });
  return { service, repository, sender, wait, admit, hash };
}
it('uses the same receipt and response floor for existing, missing and denied accounts', async () => {
  const known = fixture(),
    missing = fixture(false),
    denied = fixture();
  denied.repository.reserve.mockRejectedValue(new Error('private database or quota detail'));
  for (const f of [known, missing, denied]) {
    expect(await f.service.request({ email: 'Parent@example.test', action: 'send' }, 'ip')).toEqual(
      { status: 'requested' },
    );
    expect(f.wait).toHaveBeenCalledWith(20000);
  }
  expect(missing.sender.send).not.toHaveBeenCalled();
  expect(denied.sender.send).not.toHaveBeenCalled();
  expect(known.repository.reserve.mock.calls[0]![0]).toBe('parent@example.test');
  const token = known.sender.send.mock.calls[0]![1];
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(known.repository.reserve.mock.calls[0]![2].tokenHash).not.toBe(token);
});
it('settles an ambiguous send without retrying or exposing provider details', async () => {
  const f = fixture();
  f.sender.send.mockRejectedValue(new Error('private SMTP detail'));
  expect(await f.service.request({ email: 'parent@example.test', action: 'retry' }, 'ip')).toEqual({
    status: 'requested',
  });
  expect(f.repository.finish).toHaveBeenCalledWith(expect.any(String), 'unknown');
  expect(f.sender.send).toHaveBeenCalledOnce();
});
it('checks password policy before hashing and rejects used or expired tokens', async () => {
  const f = fixture();
  await expect(
    f.service.reset({ token: 'b'.repeat(43), password: '123456789012345' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(f.hash).not.toHaveBeenCalled();
  f.repository.consume.mockResolvedValue(false);
  await expect(
    f.service.reset({ token: 'b'.repeat(43), password: 'a new private phrase' }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 400 });
  f.repository.consume.mockResolvedValue(true);
  expect(
    await f.service.reset({ token: 'b'.repeat(43), password: 'a new private phrase' }, 'ip'),
  ).toEqual({ status: 'reset' });
});

it.each([true, false])(
  'keeps the response floor with an actual timer for account existence %s',
  async (found) => {
    vi.useFakeTimers();
    try {
      const f = fixture(found, true);
      let settled = false;
      const result = f.service
        .request({ email: 'parent@example.test', action: 'send' }, 'ip')
        .then(() => {
          settled = true;
        });
      await vi.advanceTimersByTimeAsync(19999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await result;
      expect(settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  },
);
