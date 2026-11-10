import { expect, it } from 'vitest';
import { answerWords } from './spoken-answer';

it('has the teacher ask to confirm the count it heard', () => {
  expect(answerWords({ kind: 'confirm', heard: '九根', count: 9 })).toBe(
    '我听到你说「九根」，是 9 吗？',
  );
});

it('has the teacher praise a correct count, and tell whether a hint helped', () => {
  expect(answerWords({ kind: 'done', assisted: false })).toBe('答对了！你自己算出来了。');
  expect(answerWords({ kind: 'done', assisted: true })).toMatch(/这次用了提示/);
});

it('has the teacher say what went wrong or what to do next', () => {
  expect(answerWords({ kind: 'ask', message: '不是 3', choices: false })).toBe('不是 3');
  expect(answerWords({ kind: 'failed', message: '暂时连不上，请重试。' })).toBe(
    '暂时连不上，请重试。',
  );
  expect(answerWords({ kind: 'ask', message: '', choices: false })).toBeUndefined();
});

it('leaves the teacher quiet while the child speaks or waits', () => {
  expect(answerWords({ kind: 'waiting' })).toBeUndefined();
  expect(answerWords({ kind: 'listening', message: '我在听' })).toBeUndefined();
  expect(answerWords({ kind: 'judging' })).toBeUndefined();
});
