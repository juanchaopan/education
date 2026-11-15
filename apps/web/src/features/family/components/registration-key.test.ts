import { expect, it } from 'vitest';
import { groupRegistrationKey } from './registration-key';

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
