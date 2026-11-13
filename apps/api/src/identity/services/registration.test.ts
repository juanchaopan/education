import { describe, expect, it, vi } from 'vitest';
import { createRegistrationService } from './registration.js';

const input = { email: ' Parent@Example.com ', password: '我和孩子一起探索世界的每一个小问题' };

function service() {
  const save = vi.fn().mockResolvedValue(undefined);
  const submit = createRegistrationService({
    save,
    hash: async () => 'hash',
    admit: async (work) => work(),
  });
  return { save, submit };
}

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
    expect(save).toHaveBeenCalledWith('parent@example.com', 'encoded-password-hash', null);
  });

  it("starts the family in the browser's time zone, in its usual spelling", async () => {
    const { save, submit } = service();
    await submit({ ...input, timeZone: 'america/toronto' }, 'ip');
    expect(save).toHaveBeenCalledWith('parent@example.com', 'hash', 'America/Toronto');
  });

  it('starts the family without a time zone when the name is unknown or an offset', async () => {
    const { save, submit } = service();
    await submit({ ...input, timeZone: 'Mars/Olympus_Mons' }, 'ip');
    await submit({ ...input, timeZone: '+08:00' }, 'ip');
    expect(save.mock.calls.map(([, , zone]) => zone)).toEqual([null, null]);
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
