import { describe, expect, it } from 'vitest';
import { gardenBalance, gardenBalanceSteps } from './garden-balance.js';
import { problemRegistry } from './server.js';

const { answering, checkStep } = gardenBalance;

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
