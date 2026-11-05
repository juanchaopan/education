import { expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createVerificationService } from './verification.js';
import { createMailPayload } from '../../shared/mail-payload.js';
import { tokenHash } from './session-security.js';

function fixture() {
  const payload = createMailPayload(randomBytes(32).toString('hex'));
  const repository = { reserve: vi.fn(), finish: vi.fn(), consume: vi.fn(), status: vi.fn() };
  const sender = { send: vi.fn().mockResolvedValue('accepted') };
  const service = createVerificationService({
    admit: async (work) => work(),
    repository,
    sender,
    payload,
  });
  return { repository, sender, service, payload };
}
it('persists a protected intent before sending, then records acceptance', async () => {
  const { repository, sender, service } = fixture();
  repository.reserve.mockImplementation(async (_email, mode, draft) => {
    expect(mode).toBe('send');
    expect(draft.payload).not.toContain(draft.tokenHash);
    return { ...draft, email: 'parent@example.test' };
  });
  expect(await service.send('parent@example.test', 'send')).toBe('accepted');
  const token = sender.send.mock.calls[0]![1];
  expect(repository.reserve.mock.calls[0]![2].tokenHash).toBe(tokenHash(token));
  expect(repository.finish).toHaveBeenCalledWith(expect.any(String), 'accepted');
});
it('retries only the persisted same token, never creates a replacement implicitly', async () => {
  const { repository, sender, service, payload } = fixture();
  const token = randomBytes(32).toString('base64url');
  repository.reserve.mockResolvedValue({
    id: 'existing',
    payload: payload.seal('existing', token),
    email: 'a@example.test',
  });
  await service.send('a@example.test', 'retry');
  expect(sender.send).toHaveBeenCalledWith('a@example.test', token);
});
it('does not send after a reservation rejection and does not expose provider errors', async () => {
  const { repository, sender, service } = fixture();
  repository.reserve.mockRejectedValue(new Error('rate limit'));
  await expect(service.send('a@example.test', 'resend')).rejects.toThrow();
  expect(sender.send).not.toHaveBeenCalled();
});
it('validates token syntax before storage access and reports an invalid or consumed link', async () => {
  const { repository, service } = fixture();
  await expect(service.consume('invalid', 'ip')).rejects.toMatchObject({ statusCode: 400 });
  expect(repository.consume).not.toHaveBeenCalled();
  repository.consume.mockResolvedValue(false);
  await expect(service.consume('a'.repeat(43), 'ip')).rejects.toMatchObject({ statusCode: 400 });
  repository.consume.mockResolvedValue(true);
  await expect(service.consume('b'.repeat(43), 'ip')).resolves.toEqual({ status: 'verified' });
});
