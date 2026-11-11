import { describe, expect, it } from 'vitest';
import { regionFits, uncertainFeedback } from '@education/contracts';
import {
  modelFeedbackFor,
  parseModelFeedback,
  ruleFeedbackFor,
  selfCheckFeedback,
  type ModelFeedback,
} from './teaching-feedback.js';
import { givesVerdict } from './verdict.js';

const scope = { stepId: 'count-left', drawn: true };
const reply: ModelFeedback = {
  status: 'needs-work',
  instruction: '再数一数左边圆圈里的点。',
  confidence: 0.9,
  injection: false,
  highlight: { x: 0.1, y: 0.2, width: 0.3, height: 0.2 },
};
const uncertain = uncertainFeedback('count-left');

describe('model reply parsing', () => {
  it('accepts exactly the agreed shape', () => {
    expect(parseModelFeedback(JSON.stringify(reply))).toEqual(reply);
    expect(parseModelFeedback(JSON.stringify({ ...reply, highlight: null }))).toMatchObject({
      highlight: null,
    });
  });

  it.each(['3 < 5，5 > 2', '先算 4 & 1 再比大小', '比一比：3<5 对吗？'])(
    'keeps comparison signs in maths feedback: %s',
    (instruction) => {
      expect(parseModelFeedback(JSON.stringify({ ...reply, instruction }))).toMatchObject({
        instruction,
      });
    },
  );

  it.each([
    ['not JSON', 'sure, here you go'],
    ['an array', '[]'],
    ['a missing field', JSON.stringify({ ...reply, injection: undefined })],
    ['an extra field', JSON.stringify({ ...reply, progress: 'complete' })],
    ['an unknown status', JSON.stringify({ ...reply, status: 'recognition-failed' })],
    ['an empty instruction', JSON.stringify({ ...reply, instruction: '' })],
    ['a long instruction', JSON.stringify({ ...reply, instruction: '答'.repeat(161) })],
    ['an HTML tag', JSON.stringify({ ...reply, instruction: '看<b>这里</b>' })],
    ['an HTML comment', JSON.stringify({ ...reply, instruction: '看这里<!-- x -->' })],
    ['an HTML entity', JSON.stringify({ ...reply, instruction: '看&lt;script&gt;' })],
    ['a link', JSON.stringify({ ...reply, instruction: '打开 https://example.test 看看' })],
    ['markdown', JSON.stringify({ ...reply, instruction: '[点这里](x)' })],
    ['a line break', JSON.stringify({ ...reply, instruction: '看这里\n再数一遍' })],
    ['confidence above one', JSON.stringify({ ...reply, confidence: 1.2 })],
    ['a string confidence', JSON.stringify({ ...reply, confidence: '0.9' })],
    ['a string flag', JSON.stringify({ ...reply, injection: 'false' })],
    [
      'an extra region field',
      JSON.stringify({ ...reply, highlight: { ...reply.highlight, z: 1 } }),
    ],
    [
      'a non-numeric region',
      JSON.stringify({ ...reply, highlight: { x: 'a', y: 0, width: 1, height: 1 } }),
    ],
  ])('refuses %s', (_name, text) => {
    expect(parseModelFeedback(text)).toBeUndefined();
  });
});

describe('regions', () => {
  it.each([
    [{ x: 0, y: 0, width: 1, height: 1 }, true],
    [{ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, true],
    [{ x: 0.5, y: 0.5, width: 0.6, height: 0.5 }, false],
    [{ x: -0.1, y: 0, width: 0.5, height: 0.5 }, false],
    [{ x: 0, y: 0, width: 0, height: 0.5 }, false],
  ])('checks %j against the sheet', (region, fits) => {
    expect(regionFits(region)).toBe(fits);
  });

  it('keeps marks inside a declared area', () => {
    const area = { x: 0, y: 0, width: 0.5, height: 1 };
    expect(regionFits({ x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, area)).toBe(true);
    expect(regionFits({ x: 0.4, y: 0.1, width: 0.3, height: 0.3 }, area)).toBe(false);
  });
});

describe('model feedback for a step', () => {
  it('shows a trusted reply for the requested step only', () => {
    expect(modelFeedbackFor(reply, scope)).toEqual({
      status: 'needs-work',
      instruction: reply.instruction,
      stepId: 'count-left',
      highlight: reply.highlight,
    });
  });

  it('asks for confirmation instead of trusting an unreliable reply', () => {
    expect(modelFeedbackFor({ ...reply, confidence: 0.59 }, scope)).toEqual(uncertain);
    expect(modelFeedbackFor({ ...reply, injection: true, status: 'correct' }, scope)).toEqual(
      uncertain,
    );
    expect(
      modelFeedbackFor({ ...reply, highlight: { x: 0.9, y: 0.9, width: 0.5, height: 0.5 } }, scope),
    ).toEqual(uncertain);
    expect(
      modelFeedbackFor(reply, { ...scope, area: { x: 0.6, y: 0, width: 0.4, height: 1 } }),
    ).toEqual(uncertain);
  });

  it('marks only work that needs improvement', () => {
    expect(modelFeedbackFor({ ...reply, status: 'correct' }, scope)).not.toHaveProperty(
      'highlight',
    );
    expect(modelFeedbackFor({ ...reply, highlight: null }, scope)).not.toHaveProperty('highlight');
  });

  it('never outlines a drawing the child did not make', () => {
    const text = { ...scope, drawn: false };
    expect(modelFeedbackFor(reply, text)).toEqual({
      status: 'needs-work',
      instruction: reply.instruction,
      stepId: 'count-left',
    });
    const offSheet = { ...reply, highlight: { x: 0.9, y: 0.9, width: 0.5, height: 0.5 } };
    expect(modelFeedbackFor(offSheet, text)).not.toHaveProperty('highlight');
  });
});

describe('a reply that judges what the child said', () => {
  const selfCheck = selfCheckFeedback('count-left');

  it('sends the child to check instead of confirming or denying a guess', () => {
    for (const [status, instruction] of [
      ['correct', '对，右盘有3组、每组3根黄瓜；想想一棵青菜相当于几根黄瓜。'],
      ['needs-work', '不对，再数一数左边的点。'],
      ['uncertain', '你猜对了一半，再看看左边。'],
    ] as const) {
      expect(modelFeedbackFor({ ...reply, status, instruction }, scope)).toEqual(selfCheck);
    }
  });

  it('keeps a reply that only points to the next step', () => {
    const instruction = '你把三组各三根合起来了，下一步数数一共有几根黄瓜。';
    expect(modelFeedbackFor({ ...reply, status: 'uncertain', instruction }, scope)).toMatchObject({
      status: 'uncertain',
      instruction,
    });
  });

  it('judges nothing itself and is a sentence a child may be shown', () => {
    const { instruction } = selfCheck;
    expect(selfCheck).toEqual({ status: 'uncertain', instruction, stepId: 'count-left' });
    expect(givesVerdict(instruction)).toBe(false);
    expect(parseModelFeedback(JSON.stringify({ ...reply, instruction }))).toBeDefined();
  });
});

describe('authored rule feedback', () => {
  const rule = { status: 'needs-work' as const, instruction: '先数左边。', stepId: 'count-left' };

  it('accepts conclusive feedback for the requested step', () => {
    expect(ruleFeedbackFor(rule, scope)).toEqual(rule);
    expect(ruleFeedbackFor({ ...rule, status: 'correct' }, scope)).toBeDefined();
  });

  it.each([
    ['another step', { ...rule, stepId: 'count-right' }],
    ['an inconclusive result', { ...rule, status: 'uncertain' as const }],
    ['a failed recognition', { ...rule, status: 'recognition-failed' as const }],
    ['markup', { ...rule, instruction: '<b>先数左边</b>' }],
    ['a region off the sheet', { ...rule, highlight: { x: 2, y: 0, width: 1, height: 1 } }],
  ])('leaves %s to the model', (_name, feedback) => {
    expect(ruleFeedbackFor(feedback, scope)).toBeUndefined();
  });
});
