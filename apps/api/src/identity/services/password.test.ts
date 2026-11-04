import { expect, it } from 'vitest';
import { verify } from 'argon2';
import { hashParentPassword } from './password.js';
import { passwordIssue } from '@education/contracts';

it('uses salted Argon2id at the accepted cost, preserving spaces and Unicode', async () => {
  const password = '  一起探索这个世界的每一个小小问题  ';
  const first = await hashParentPassword(password);
  const second = await hashParentPassword(password);
  expect(first).not.toEqual(second);
  expect(first).toContain('$argon2id$v=19$m=32768,t=3,p=1$');
  expect(await verify(first, password)).toBe(true);
  expect(await verify(first, password.trim())).toBe(false);
});

it('counts Unicode code points and bounds the maximum UTF-8 size', () => {
  expect(passwordIssue('🌱'.repeat(14))).toBeDefined();
  expect(passwordIssue('🌱'.repeat(127) + '🌼')).toBeUndefined();
  expect(passwordIssue('🌱'.repeat(128) + '🌼')).toBeDefined();
});
