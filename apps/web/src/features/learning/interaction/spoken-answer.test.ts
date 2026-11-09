import { expect, it } from 'vitest';
import type { Judgement } from '../data-access/useLessonAnswer';
import type { VoiceState } from '../data-access/voice-input';
import { answerStep, type CountWords } from './spoken-answer';

const open: Judgement = { status: 'open' };
const idle: VoiceState = { status: 'idle' };
const wrong: Judgement = { status: 'judged', outcome: 'incorrect', count: 3 };
const words: CountWords = { unit: '根', explain: (count) => `不是 ${count}` };

it('waits for the microphone to open by itself, then listens for the answer', () => {
  expect(answerStep(idle, open, words, true)).toEqual({ kind: 'waiting' });
  expect(answerStep({ status: 'starting' }, open, words, true)).toEqual({
    kind: 'listening',
    message: '正在打开麦克风…',
  });
  expect(answerStep({ status: 'recording' }, open, words)).toEqual({
    kind: 'listening',
    message: '我在听，说出你的答案吧。说完停一下就好。',
  });
});

it('asks for the confirmation of a heard number before anything is sent', () => {
  expect(answerStep({ status: 'review', text: '九根' }, open, words)).toEqual({
    kind: 'confirm',
    heard: '九根',
    count: 9,
  });
});

it('hears the count in the answer’s unit inside a whole sentence', () => {
  const heard = '一棵青菜和九根黄瓜一样重';
  expect(answerStep({ status: 'review', text: heard }, open, words)).toMatchObject({
    kind: 'confirm',
    count: 9,
  });
});

it('asks again, without judging, when no single number was heard or nothing was said', () => {
  const step = answerStep({ status: 'review', text: '黄瓜' }, open, words);
  expect(step).toMatchObject({ kind: 'ask', choices: false });
  expect(answerStep({ status: 'unheard' }, open, words)).toMatchObject({
    kind: 'ask',
    choices: false,
  });
  expect(answerStep({ status: 'unavailable', reason: 'quiet' }, open, words)).toEqual({
    kind: 'ask',
    message: '没有听到你说话。可以再说一次。',
    choices: false,
  });
  expect(answerStep({ status: 'unavailable', reason: 'short' }, open, words)).toEqual({
    kind: 'ask',
    message: '这次没录上，可以再说一次。',
    choices: false,
  });
});

it('offers numbers to tap only when speech cannot be used', () => {
  for (const voice of [
    { status: 'unavailable', reason: 'denied' },
    { status: 'unavailable', reason: 'unsupported' },
    { status: 'fallback', reason: 'unauthorized' },
    { status: 'fallback', reason: 'disabled' },
    { status: 'fallback', reason: 'usage-limited' },
    { status: 'guidance' },
  ] satisfies VoiceState[])
    expect(answerStep(voice, open, words)).toMatchObject({ kind: 'ask', choices: true });
  for (const voice of [
    { status: 'unavailable', reason: 'empty' },
    { status: 'fallback', reason: 'invalid-input' },
    { status: 'fallback', reason: 'timeout' },
  ] satisfies VoiceState[])
    expect(answerStep(voice, open, words)).toMatchObject({ kind: 'ask', choices: false });
});

it('says what to do instead of speaking in the words of tapping', () => {
  expect(answerStep({ status: 'fallback', reason: 'unauthorized' }, open, words)).toEqual({
    kind: 'ask',
    message: '需要家长先同意语音转写。可以点下面的数字回答。',
    choices: true,
  });
  expect(answerStep({ status: 'unavailable', reason: 'empty' }, open, words)).toMatchObject({
    message: '这次没有录到声音。可以再说一次。',
  });
});

it('explains a wrong count and lets the child speak again', () => {
  expect(answerStep(idle, wrong, words)).toEqual({
    kind: 'ask',
    message: '不是 3',
    choices: false,
  });
  expect(answerStep({ status: 'recording' }, wrong, words)).toMatchObject({ kind: 'listening' });
  expect(answerStep({ status: 'unheard' }, wrong, words)).toMatchObject({
    message: '没有听清你说的话。可以再说一次。',
  });
});

it('keeps the numbers beside the explanation once speech has proved unusable', () => {
  expect(answerStep({ status: 'unavailable', reason: 'denied' }, wrong, words)).toEqual({
    kind: 'ask',
    message: '不是 3',
    choices: true,
  });
});

it('finishes with a correct answer and tells whether a hint helped', () => {
  for (const [outcome, assisted] of [
    ['independent', false],
    ['assisted', true],
  ] as const)
    expect(answerStep(idle, { status: 'judged', outcome, count: 9 }, words, true)).toEqual({
      kind: 'done',
      assisted,
    });
});

it('keeps a failed submission retryable while the answer is being judged', () => {
  expect(answerStep(idle, { status: 'judging' }, words)).toEqual({ kind: 'judging' });
  expect(answerStep(idle, { status: 'failed', message: '暂时连不上，请重试。' }, words)).toEqual({
    kind: 'failed',
    message: '暂时连不上，请重试。',
  });
});
