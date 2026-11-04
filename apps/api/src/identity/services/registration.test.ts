import { describe, expect, it, vi } from 'vitest';
import { createRegistrationService } from './registration.js';

const input = { email: ' Parent@Example.com ', password: '我和孩子一起探索世界的每一个小问题' };

describe('parent registration', () => {
  it('normalizes email, hashes the exact password, and never grants a session', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const hash = vi.fn().mockResolvedValue('encoded-password-hash');
    const submit = createRegistrationService({ save, hash, admit: async (work) => work() });
    expect(await submit(input, '127.0.0.1')).toEqual({
      status: 'pending-verification',
      mail: 'not-sent',
    });
    expect(hash).toHaveBeenCalledWith(input.password);
    expect(save).toHaveBeenCalledWith('parent@example.com', 'encoded-password-hash');
  });

  it('rejects weak passwords before consuming hashing resources', async () => {
    const hash = vi.fn();
    const submit = createRegistrationService({
      save: vi.fn(),
      hash,
      admit: async (work) => work(),
    });
    await expect(submit({ ...input, password: 'password123456789' }, 'ip')).rejects.toThrow();
    expect(hash).not.toHaveBeenCalled();
  });

  it('does not turn a database failure into success', async () => {
    const submit = createRegistrationService({
      save: async () => {
        throw new Error('database unavailable');
      },
      hash: async () => 'hash',
      admit: async (work) => work(),
    });
    await expect(submit(input, 'ip')).rejects.toThrow('database unavailable');
  });

  it('uses an isolated mail adapter without reporting delivery', async () => {
    const requestVerification = vi.fn().mockResolvedValue('not-sent');
    const submit = createRegistrationService({
      save: vi.fn(),
      hash: async () => 'hash',
      admit: async (work) => work(),
      mail: { requestVerification },
    });
    expect((await submit(input, 'ip')).mail).toBe('not-sent');
    expect(requestVerification).toHaveBeenCalledWith('parent@example.com');
  });
});
