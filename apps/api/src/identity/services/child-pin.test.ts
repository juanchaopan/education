import { expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyParentPassword } from './password.js';
import { createChildPin } from './child-pin.js';

it('binds the PIN to its family, child and pepper before applying the established Argon2 profile', async () => {
  const pepper = 'ab'.repeat(32);
  const hash = await createChildPin(pepper)('family-a', 'child-a', '018274');
  const material = (family: string, child: string) =>
    createHmac('sha256', Buffer.from(pepper, 'hex'))
      .update(JSON.stringify([1, family, child, '018274']))
      .digest('base64url');
  expect(hash).toContain('$argon2id$v=19$m=32768,t=3,p=1$');
  expect(await verifyParentPassword(hash, material('family-a', 'child-a'))).toBe(true);
  expect(await verifyParentPassword(hash, material('family-b', 'child-a'))).toBe(false);
  expect(await verifyParentPassword(hash, material('family-a', 'child-b'))).toBe(false);
  expect(await verifyParentPassword(hash, '018274')).toBe(false);
});

it('refuses a missing or malformed PIN pepper', () => {
  for (const pepper of ['', 'ab'.repeat(31), 'z'.repeat(64)])
    expect(() => createChildPin(pepper)).toThrow('PIN_PEPPER');
});
