import { expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createMailPayload } from './mail-payload.js';

it('encrypts short-lived tokens, binds the intent, and rejects tampering or the wrong key', () => {
  const key = randomBytes(32).toString('hex');
  const codec = createMailPayload(key);
  const token = randomBytes(32).toString('base64url');
  const sealed = codec.seal('intent-a', token);
  expect(sealed).not.toContain(token);
  expect(codec.open('intent-a', sealed)).toBe(token);
  expect(() => codec.open('intent-b', sealed)).toThrow();
  expect(() =>
    createMailPayload(randomBytes(32).toString('hex')).open('intent-a', sealed),
  ).toThrow();
  expect(() => codec.open('intent-a', sealed.slice(0, -4))).toThrow();
});
