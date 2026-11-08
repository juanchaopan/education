import { expect, it } from 'vitest';
import type { VoiceState } from '../data-access/voice-input';
import { answerStep, type Judgement } from './spoken-answer';

const open: Judgement = { status: 'open' };
const idle: VoiceState = { status: 'idle' };
const wrong: Judgement = { status: 'judged', outcome: 'incorrect', count: 3 };
const explain = (count: number) => `不是 ${count}`;

it('asks for the confirmation of a heard number before anything is sent', () => {
  expect(answerStep({ status: 'review', text: '九根' }, open, explain)).toEqual({
    kind: 'confirm',
    heard: '九根',
    count: 9,
  });
});

it('asks again, without judging, when no single number was heard', () => {
  const step = answerStep({ status: 'review', text: '黄瓜' }, open, explain);
  expect(step).toMatchObject({ kind: 'ask', choices: false });
  expect(answerStep({ status: 'unheard' }, open, explain)).toMatchObject({
    kind: 'ask',
    choices: false,
  });
});

it('offers numbers to tap only when speech cannot be used', () => {
  for (const voice of [
    { status: 'unavailable', reason: 'denied' },
    { status: 'unavailable', reason: 'unsupported' },
    { status: 'fallback', reason: 'unauthorized' },
    { status: 'fallback', reason: 'disabled' },
    { status: 'fallback', reason: 'timeout' },
    { status: 'guidance' },
  ] satisfies VoiceState[])
    expect(answerStep(voice, open, explain)).toMatchObject({ kind: 'ask', choices: true });
  for (const voice of [
    { status: 'unavailable', reason: 'empty' },
    { status: 'fallback', reason: 'invalid-input' },
  ] satisfies VoiceState[])
    expect(answerStep(voice, open, explain)).toMatchObject({ kind: 'ask', choices: false });
});

it('explains a wrong count and lets the child speak again', () => {
  expect(answerStep(idle, wrong, explain)).toEqual({
    kind: 'ask',
    message: '不是 3',
    choices: false,
  });
  expect(answerStep({ status: 'recording' }, wrong, explain)).toMatchObject({ kind: 'listening' });
});

it('keeps the numbers beside the explanation once speech has proved unusable', () => {
  expect(answerStep({ status: 'unavailable', reason: 'denied' }, wrong, explain)).toEqual({
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
    expect(answerStep(idle, { status: 'judged', outcome, count: 9 }, explain)).toEqual({
      kind: 'done',
      assisted,
    });
});

it('keeps a failed submission retryable while the answer is being judged', () => {
  expect(answerStep(idle, { status: 'judging' }, explain)).toEqual({ kind: 'judging' });
  expect(answerStep(idle, { status: 'failed', message: '暂时连不上，请重试。' }, explain)).toEqual({
    kind: 'failed',
    message: '暂时连不上，请重试。',
  });
});
