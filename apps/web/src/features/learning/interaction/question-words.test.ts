import { describe, expect, it } from 'vitest';
import { teachers } from '../media/teachers/teachers';
import { questionPhase, questionWords } from './question-words';

const idle = { status: 'idle' } as const;
const quiet = { voice: idle, reply: idle, sendFailed: false };
const guidance = '碰一碰这个苹果。';
const reply = { status: 'ready', source: 'ai', reply: '看看哪边低一些。' } as const;

describe('the question box', () => {
  it('shows the voice while held, the words being heard, then the words to read over', () => {
    expect(questionPhase({ ...quiet, voice: { status: 'starting' } })).toBe('listening');
    expect(questionPhase({ ...quiet, voice: { status: 'recording' } })).toBe('listening');
    expect(questionPhase({ ...quiet, voice: { status: 'transcribing' } })).toBe('hearing');
    expect(questionPhase({ ...quiet, voice: { status: 'review', text: '为什么' } })).toBe('review');
  });

  it('keeps the question sent while its reply is on the way, and then closes', () => {
    expect(questionPhase({ ...quiet, reply: { status: 'pending' }, asked: '为什么' })).toBe(
      'asked',
    );
    expect(questionPhase({ ...quiet, reply, asked: '为什么' })).toBeUndefined();
    expect(questionPhase(quiet)).toBeUndefined();
  });

  it('closes when speech could not be used', () => {
    expect(
      questionPhase({ ...quiet, voice: { status: 'unavailable', reason: 'denied' } }),
    ).toBeUndefined();
  });
});

describe("the teacher's words about the question", () => {
  it('thinks while the reply is on the way, then says it', () => {
    expect(questionWords({ ...quiet, reply: { status: 'pending' } }, guidance)).toEqual({
      thinking: true,
    });
    expect(questionWords({ ...quiet, reply }, guidance)).toEqual({ text: '看看哪边低一些。' });
    expect(
      questionWords(
        { ...quiet, reply: { ...reply, source: 'rules', reply: '说得对！' } },
        guidance,
      ),
    ).toEqual({ text: '说得对！' });
  });

  it("falls back on the scene's guidance when the teacher cannot answer", () => {
    expect(questionWords({ ...quiet, reply: { status: 'guidance' } }, guidance)).toEqual({
      text: '好的，不等了。碰一碰这个苹果。',
    });
    expect(
      questionWords({ ...quiet, reply: { status: 'fallback', reason: 'timeout' } }, guidance).text,
    ).toMatch(/碰一碰这个苹果。$/);
  });

  it('asks the child to open the problem again when the server could not take the question', () => {
    expect(
      questionWords({ ...quiet, reply: { status: 'fallback', reason: 'invalid-input' } }, guidance),
    ).toEqual({ text: '这个问题我这次答不上来，重新打开题目再问吧。碰一碰这个苹果。' });
  });

  it('says it as whichever teacher tells the lesson, naming none of them', () => {
    const { text } = questionWords(
      { ...quiet, reply: { status: 'fallback', reason: 'invalid-input' } },
      guidance,
    );
    for (const { name } of Object.values(teachers)) expect(text).not.toContain(name);
  });

  it('says why speech could not be used, and sends the child back to the scene', () => {
    expect(
      questionWords({ ...quiet, voice: { status: 'unavailable', reason: 'denied' } }, guidance)
        .text,
    ).toMatch(/^没有拿到麦克风权限。/);
    expect(questionWords({ ...quiet, voice: { status: 'unheard' } }, guidance).text).toMatch(
      /没有听清/,
    );
  });

  it('says a question that did not go out, and nothing while the child reads it over', () => {
    const review = { status: 'review', text: '为什么' } as const;
    expect(questionWords({ ...quiet, voice: review }, guidance)).toEqual({});
    expect(questionWords({ ...quiet, voice: review, sendFailed: true }, guidance)).toEqual({
      text: '暂时连不上，还没发出去。',
    });
  });

  it('says nothing while the child holds the microphone', () => {
    expect(questionWords({ ...quiet, voice: { status: 'recording' } }, guidance)).toEqual({});
  });
});
