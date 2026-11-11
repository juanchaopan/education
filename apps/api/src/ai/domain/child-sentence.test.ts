import { expect, it } from 'vitest';
import { isChildSentence } from './child-sentence.js';

it('allows plain sentences up to the length the reply allows', () => {
  expect(isChildSentence('先数一数左边。', 7)).toBe(true);
  expect(isChildSentence('先数一数左边的点。', 7)).toBe(false);
  expect(isChildSentence('比一比：3<5 对吗？', 20)).toBe(true);
});

it.each(['', ' 先数左边', '看<b>这里</b>', '看&lt;这里', '打开 https://x.test', '看这里\n再数'])(
  'refuses %j',
  (sentence) => {
    expect(isChildSentence(sentence, 160)).toBe(false);
  },
);
