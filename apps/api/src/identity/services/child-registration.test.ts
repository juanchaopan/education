import { expect, it, vi } from 'vitest';
import { randomUUID, createHmac } from 'node:crypto';
import { verify } from 'argon2';
import { createChildRegistrationService } from './child-registration.js';
import { createChildPin } from './child-pin.js';

it('admits redemption before hashing and keeps raw KEY, PIN and request ID out of persistence', async () => {
  const input = {
    requestId: randomUUID(),
    key: 'ABCD-EFGH-JKMN-PQRS',
    nickname: ' ＡＢＣ ',
    pin: '018274',
  };
  const hashPin = vi.fn().mockResolvedValue('argon2-hash');
  const redeem = vi.fn(async (_attempt, hash) => {
    await hash('family', 'child');
    return { status: 'registered' as const, familyCode: 'ABCD-EFGH-JKMN', nickname: 'ABC' };
  });
  const admit = vi.fn(async (work) => work());
  const service = createChildRegistrationService({
    repository: { redeem },
    admit,
    hashPin,
    fingerprintKey: 'secret'.repeat(8),
  });
  await service(input, 'ip');
  expect(admit).toHaveBeenCalledWith(
    expect.any(Function),
    expect.stringMatching(/^[a-f0-9]{64}$/),
    'ip',
    'child-registration',
  );
  expect(hashPin).toHaveBeenCalledWith('family', 'child', '018274');
  const attempt = redeem.mock.calls[0]![0];
  expect(attempt).toMatchObject({ nickname: 'ABC', canonical: 'abc' });
  for (const raw of [input.key, input.pin, input.requestId])
    expect(JSON.stringify(attempt)).not.toContain(raw);
  await service(input, 'ip');
  expect(redeem.mock.calls[1]![0]).toEqual(attempt);
  await service({ ...input, pin: '018275' }, 'ip');
  expect(redeem.mock.calls[2]![0].fingerprint).not.toBe(attempt.fingerprint);
});
it('uses versioned, identity-bound pepper before the full Argon2id profile', async () => {
  const pepper = 'ab'.repeat(32);
  const hashed = await createChildPin(pepper)('family', 'child', '018274');
  expect(hashed).toContain('$argon2id$v=19$m=32768,t=3,p=1$');
  expect(await verify(hashed, '018274')).toBe(false);
  const digest = (family: string, child: string) =>
    createHmac('sha256', Buffer.from(pepper, 'hex'))
      .update(JSON.stringify([1, family, child, '018274']))
      .digest('base64url');
  expect(await verify(hashed, digest('family', 'child'))).toBe(true);
  expect(await verify(hashed, digest('other', 'child'))).toBe(false);
  expect(() => createChildPin('')).toThrow();
});
