import { expect, it } from 'vitest';
import { editRegistrationKey, groupRegistrationKey } from './registration-key';

it.each([
  ['', ''],
  ['abc', 'ABC'],
  ['abcd', 'ABCD'],
  ['abcde', 'ABCD-E'],
  ['ABCD-', 'ABCD'],
  ['abcdefghjkmnpqrs', 'ABCD-EFGH-JKMN-PQRS'],
  ['ABCD-EFGH-JKMN-PQRS', 'ABCD-EFGH-JKMN-PQRS'],
  [' abcd efgh\tjkmn—pqrs ', 'ABCD-EFGH-JKMN-PQRS'],
  ['ABCD-EFGH-JKMN-PQRS-TV', 'ABCD-EFGH-JKMN-PQRS'],
  ['钥匙ABCD', 'ABCD'],
])('groups %j as %j', (typed, grouped) => {
  expect(groupRegistrationKey(typed)).toBe(grouped);
});

it('keeps the caret after the characters typed before it', () => {
  expect(editRegistrationKey('ABCD-EFGH', 'ABCD-EFGHJ', 10)).toEqual({
    value: 'ABCD-EFGH-J',
    caret: 11,
  });
  expect(editRegistrationKey('ABCD-EFGH', 'ABXCD-EFGH', 3)).toEqual({
    value: 'ABXC-DEFG-H',
    caret: 3,
  });
  expect(editRegistrationKey('ABCD-EFGH', 'ABD-EFGH', 2)).toEqual({ value: 'ABDE-FGH', caret: 2 });
});

it('deletes the character before a dash when the dash is deleted', () => {
  expect(editRegistrationKey('ABCD-EFGH', 'ABCDEFGH', 4)).toEqual({ value: 'ABCE-FGH', caret: 3 });
});

it('puts the caret at the end of a pasted KEY', () => {
  expect(editRegistrationKey('', 'abcd efgh jkmn pqrs', 19)).toEqual({
    value: 'ABCD-EFGH-JKMN-PQRS',
    caret: 19,
  });
});
