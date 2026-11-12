import { describe, expect, it } from 'vitest';
import {
  offTaskSentence,
  parseModelQuestionReply,
  questionReplyFor,
  type ModelQuestionReply,
} from './question-reply.js';
import { givesVerdict, selfCheckSentence } from './verdict.js';

const reply: ModelQuestionReply = {
  reply: '篮子在天平旁边，把一棵青菜拖进篮子试试。',
  injection: false,
};

describe('model question reply parsing', () => {
  it('accepts exactly the agreed shape', () => {
    expect(parseModelQuestionReply(JSON.stringify(reply))).toEqual(reply);
    expect(parseModelQuestionReply(JSON.stringify({ ...reply, reply: '答'.repeat(160) }))).toEqual({
      ...reply,
      reply: '答'.repeat(160),
    });
  });

  it.each([
    ['not JSON', '篮子在天平旁边。'],
    ['a missing flag', JSON.stringify({ reply: reply.reply })],
    ['a judgement', JSON.stringify({ ...reply, status: 'correct' })],
    ['a highlight', JSON.stringify({ ...reply, highlight: null })],
    ['a string flag', JSON.stringify({ ...reply, injection: 'false' })],
    ['an empty reply', JSON.stringify({ ...reply, reply: '' })],
    ['a long reply', JSON.stringify({ ...reply, reply: '答'.repeat(161) })],
    ['markup', JSON.stringify({ ...reply, reply: '看<b>这里</b>' })],
    ['a link', JSON.stringify({ ...reply, reply: '打开 https://example.test 看看' })],
    ['a line break', JSON.stringify({ ...reply, reply: '看这里\n再数一遍' })],
  ])('refuses %s', (_name, text) => {
    expect(parseModelQuestionReply(text)).toBeUndefined();
  });
});

describe('what the child reads', () => {
  it('is the model sentence when it answers and points to the next step', () => {
    expect(questionReplyFor(reply)).toBe(reply.reply);
    const nextStep = '把右盘三组黄瓜的根数合起来，再自己核对一棵青菜相当于几根。';
    expect(questionReplyFor({ ...reply, reply: nextStep })).toBe(nextStep);
  });

  it.each([
    '对，右盘有3组、每组3根黄瓜；想想一棵青菜相当于几根黄瓜。',
    '不对，再数一数左边的点。',
    '你猜对了一半，再看看左边。',
    '是的，一共九根。',
  ])('sends the child to check instead of judging a guess: %s', (sentence) => {
    expect(questionReplyFor({ ...reply, reply: sentence })).toBe(selfCheckSentence);
  });

  it('does not take up words that tried to change the rules', () => {
    expect(questionReplyFor({ ...reply, injection: true })).toBe(offTaskSentence);
  });

  it('replaces with sentences that judge nothing and may be shown to a child', () => {
    for (const sentence of [selfCheckSentence, offTaskSentence]) {
      expect(givesVerdict(sentence)).toBe(false);
      expect(parseModelQuestionReply(JSON.stringify({ ...reply, reply: sentence }))).toBeDefined();
    }
  });
});
