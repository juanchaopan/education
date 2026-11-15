import { describe, expect, it } from 'vitest';
import { gardenBalance, gardenBalanceSteps } from './garden-balance.js';
import { gardenBalanceLesson, gardenVariationChoices } from './lessons/garden-balance.js';
import { problemRegistry } from './server.js';

const { answering, variation } = gardenBalance;

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

  it("states neither the variation's result nor its reason in any scene's prompt", () => {
    for (const { prompt } of Object.values(gardenBalanceSteps)) {
      expect(prompt).not.toMatch(/6|六根|还是三组|组数没变/);
    }
  });

  it('says the question before anything else, and the variation only once it is asked', () => {
    const { lines, scenes } = gardenBalanceLesson;
    expect(lines.hello.text).toContain('一棵青菜和几根黄瓜一样重？');
    const asked = ['change', 'swap', 'why'] as const;
    for (const line of asked) expect(lines[line].text).not.toMatch(/6|六|还是三组/);
    expect(scenes.reveal.entry).toEqual(['reveal']);
  });

  it('first says in every hint what the child is looking for, without the count', () => {
    for (const hint of Object.values(answering?.hints ?? {})) {
      expect(hint).toMatch(/^我们在找一棵青菜和几根黄瓜一样重。/);
      expect(hint).not.toMatch(/9|九/);
    }
  });
});

describe('garden balance variation', () => {
  const reason = (say: string) => variation?.checkReason({ say });

  it('has its own one or two hints, each first saying what is looked for, without the count', () => {
    const hints = Object.values(variation?.hints ?? {});
    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.length).toBeLessThanOrEqual(2);
    for (const hint of hints) {
      expect(hint).toMatch(/^我们在找每个苹果只换两根时，一棵青菜和几根黄瓜一样重。/);
      expect(hint).not.toMatch(/6|六/);
    }
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
    expect(gardenBalanceLesson.variation?.choices).toBe(gardenVariationChoices);
    expect(Object.keys(gardenVariationChoices)).toEqual(['groups', 'per-group']);
    const choose = (kept: string[], changed: string[]) =>
      variation?.checkReason({ choose: { kept, changed } });
    expect(choose(['groups'], ['per-group'])).toBe('correct');
    expect(choose(['per-group'], ['groups'])).toBe('incorrect');
    expect(choose([], ['groups', 'per-group'])).toBe('incorrect');
    expect(choose([], [])).toBe('uncertain');
  });
});
