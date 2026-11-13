import { describe, expect, it } from 'vitest';
import { gardenBalance, gardenBalanceSteps } from './garden-balance.js';
import { gardenVariationChoices } from './lessons/garden-balance.js';
import { problemRegistry } from './server.js';

const { answering, variation, checkStep } = gardenBalance;

describe('garden balance', () => {
  it('is a first grade 学而思 maths problem in the maintained registry', () => {
    expect(problemRegistry.find('garden-balance', 1)).toBe(gardenBalance);
    expect(problemRegistry.summary('garden-balance', 1)).toMatchObject({
      grade: '一年级',
      subject: '数学',
      category: '学而思',
    });
  });

  it('counts nine cucumbers as correct and any other whole number as a mistake', () => {
    expect(answering?.checkCompletion(9)).toBe('correct');
    for (const wrong of [3, 6, 2, 0, 18])
      expect(answering?.checkCompletion(wrong)).toBe('incorrect');
  });

  it('treats anything that is not a whole number as not understood, never as a mistake', () => {
    for (const unclear of ['九根', 9.5, true, [9], { count: 9 }])
      expect(answering?.checkCompletion(unclear)).toBe('uncertain');
  });

  it('opens every scene to questions, with its own words and without the final count', () => {
    for (const { prompt, vocabulary } of Object.values(gardenBalanceSteps)) {
      expect(prompt).not.toMatch(/9|九/);
      expect(vocabulary).toContain('黄瓜');
    }
  });

  it('answers the closing question by rule only when it is said the right way round', async () => {
    const status = async (stepId: string, answer: string) =>
      (await checkStep?.({ stepId, answer }))?.status;
    expect(await status('end', '还是三组，每组变成两根')).toBe('correct');
    expect(await status('end', '组数没变，根数变了')).toBe('correct');
    for (const unclear of ['每组变了', '组数变了，根数没变', '不是三组，也不是两根', '黄瓜变少了'])
      expect(await status('end', unclear)).toBe('uncertain');
    expect(await status('bridge', '还是三组，每组两根')).toBe('uncertain');
  });
});

describe('garden balance variation', () => {
  const reason = (say: string) => variation?.checkReason({ say });

  it('has its own one or two hints', () => {
    const hints = Object.values(variation?.hints ?? {});
    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.length).toBeLessThanOrEqual(2);
    expect(hints).toContain('数一数，现在有几组？每组有几根？');
  });

  it('judges the guess of six cucumbers, never counting words as wrong', () => {
    expect(variation?.checkGuess(6)).toBe('correct');
    for (const wrong of [9, 3, 2, 5]) expect(variation?.checkGuess(wrong)).toBe('incorrect');
    for (const unclear of ['六根', 6.5, [6]])
      expect(variation?.checkGuess(unclear)).toBe('uncertain');
  });

  it('counts a reason said the right way round as clear', () => {
    for (const clear of ['还是三组，每组两根', '组数没变，根数变了', '还是三组，每组变成了两根'])
      expect(reason(clear)).toBe('correct');
  });

  it('counts a reversed, half or off-topic reason as not clear', () => {
    for (const unclear of [
      '变成两组了',
      '组数变了，根数没变',
      '每组还是三根',
      '不是三组，也不是两根',
      '一共六根',
      '因为黄瓜变少了',
      '不知道',
    ])
      expect(reason(unclear)).toBe('incorrect');
  });

  it('leaves a reason without words unjudged', () => {
    for (const noise of ['嗯', '啊……']) expect(reason(noise)).toBe('uncertain');
  });

  it('judges the dew drops by the lesson choices: groups kept, the count in each changed', () => {
    expect(Object.keys(gardenVariationChoices)).toEqual(['groups', 'per-group']);
    const choose = (kept: string[], changed: string[]) =>
      variation?.checkReason({ choose: { kept, changed } });
    expect(choose(['groups'], ['per-group'])).toBe('correct');
    expect(choose(['per-group'], ['groups'])).toBe('incorrect');
    expect(choose([], ['groups', 'per-group'])).toBe('incorrect');
    expect(choose([], [])).toBe('uncertain');
  });
});
