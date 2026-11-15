import { expect, it } from 'vitest';
import { childIdentity } from './child-registration.js';

it('normalizes grouping, case and NFKC nickname while preserving six-digit PINs', () => {
  expect(
    childIdentity({ key: 'abcd-efgh-jkmn-pqrs', nickname: ' ＡＢＣ小明 ', pin: '018274' }),
  ).toEqual({ key: 'ABCDEFGHJKMNPQRS', nickname: 'ABC小明', canonical: 'abc小明', pin: '018274' });
});
it('accepts a nickname of twelve characters once normalized and trimmed', () => {
  for (const nickname of ['小'.repeat(12), ` ${'Ａ'.repeat(12)} `])
    expect(
      childIdentity({ key: 'ABCDEFGHJKMNPQRS', nickname, pin: '018274' }).nickname,
    ).toHaveLength(12);
});
it('rejects ambiguous keys, invalid nicknames and weak PINs with recovery instructions', () => {
  for (const pin of ['111111', '123456', '654321', '１２３４５６', '12345']) {
    expect(() => childIdentity({ key: 'ABCDEFGHJKMNPQRS', nickname: '小明', pin })).toThrow(
      /六位|连续|相同/,
    );
  }
  for (const nickname of ['', 'a b', '🐱', 'a'.repeat(13), '小'.repeat(13)])
    expect(() => childIdentity({ key: 'ABCDEFGHJKMNPQRS', nickname, pin: '018274' })).toThrow(
      /昵称请用 1–12 个/,
    );
  expect(() => childIdentity({ key: 'invalid', nickname: '小明', pin: '018274' })).toThrow(/KEY/);
});
