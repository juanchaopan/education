import { describe, expect, it } from 'vitest';
import { sceneSteps, variationReason, wholeNumberAnswer } from './lesson-rules.js';

describe('wholeNumberAnswer', () => {
  const check = wholeNumberAnswer(4);

  it('counts the expected whole number as correct and any other as a mistake', () => {
    expect(check(4)).toBe('correct');
    for (const wrong of [0, 3, 5, -4, 40]) expect(check(wrong)).toBe('incorrect');
  });

  it('never counts an answer that is not a whole number as wrong', () => {
    for (const unclear of ['四', '4', 4.5, Number.NaN, false, [4], { count: 4 }])
      expect(check(unclear)).toBe('uncertain');
  });
});

describe('variationReason', () => {
  const check = variationReason({
    says: (text) => (text.includes('还是两袋') ? 'correct' : 'incorrect'),
    choices: ['bags', 'per-bag', 'colour'],
    kept: ['bags'],
    changed: ['per-bag'],
  });
  const choose = (kept: string[], changed: string[]) => check({ choose: { kept, changed } });

  it("judges a spoken reason by the problem's rule", () => {
    expect(check({ say: '还是两袋，每袋少了' })).toBe('correct');
    expect(check({ say: '变成三袋了' })).toBe('incorrect');
    expect(check({ say: '因为我喜欢' })).toBe('incorrect');
  });

  it('leaves a spoken reason without words unjudged, never counting it as wrong', () => {
    for (const noise of ['嗯', '嗯嗯啊', '呃……', '?', ' '])
      expect(check({ say: noise })).toBe('uncertain');
  });

  it('counts exactly the expected taps as right and any other taps as not clear', () => {
    expect(choose(['bags'], ['per-bag'])).toBe('correct');
    expect(choose(['per-bag'], ['bags'])).toBe('incorrect');
    expect(choose(['bags', 'per-bag'], [])).toBe('incorrect');
    expect(choose(['bags'], ['per-bag', 'colour'])).toBe('incorrect');
    expect(choose(['bags'], ['bags'])).toBe('incorrect');
  });

  it('leaves no tap, or a tap of a choice the lesson does not have, unjudged', () => {
    expect(choose([], [])).toBe('uncertain');
    expect(choose(['bags'], ['weight'])).toBe('uncertain');
  });
});

describe('sceneSteps', () => {
  it("gives every scene its declared prompt and the problem's vocabulary, by scene id", () => {
    const vocabulary = ['苹果', '一样重'];
    const scenes = {
      weigh: { prompt: '称一称。', entry: ['hello'] },
      count: { prompt: '数一数。', entry: ['ask'] },
    };
    expect(sceneSteps({ shots: ['weigh', 'count'], scenes, vocabulary })).toEqual({
      weigh: { prompt: '称一称。', vocabulary },
      count: { prompt: '数一数。', vocabulary },
    });
  });
});
