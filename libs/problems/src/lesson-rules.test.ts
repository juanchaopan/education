import { describe, expect, it } from 'vitest';
import { sceneSteps, wholeNumberAnswer } from './lesson-rules.js';

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
