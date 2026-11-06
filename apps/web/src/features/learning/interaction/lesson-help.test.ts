import { describe, expect, it } from 'vitest';
import { createLessonHelp, feedbackForStep } from './lesson-help';

describe('contextual lesson help', () => {
  it('records help only with the scene and action that received it', () => {
    const help = createLessonHelp();
    help.record('select-partner', 'hint');
    help.record('first-gap', 'replay');
    help.record('first-gap', 'retry');
    const entries = help.entries();
    entries.pop();
    expect(help.entries()).toEqual([
      { stepId: 'select-partner', kind: 'hint' },
      { stepId: 'first-gap', kind: 'replay' },
      { stepId: 'first-gap', kind: 'retry' },
    ]);
  });

  it('lets different subjects define their own observations and confirmation', () => {
    const observed = {
      stepId: 'compare-leaf-veins',
      status: 'correct',
      instruction: '你找到了从叶柄延伸出去的主叶脉。',
    } as const;
    const unheard = {
      stepId: 'listen-to-the-first-sound',
      status: 'uncertain',
      instruction: '我没听清第一个音。请再说一遍，或者点一下你听到的音。',
    } as const;
    expect(feedbackForStep(observed.stepId, observed)).toEqual(observed);
    expect(feedbackForStep(unheard.stepId, unheard)).toEqual(unheard);
  });

  it('asks for another try without inventing a wrong answer when no rule can judge', () => {
    expect(feedbackForStep('select-partner')).toMatchObject({
      stepId: 'select-partner',
      status: 'uncertain',
      instruction: expect.stringContaining('再试'),
    });
    const failed = {
      stepId: 'first-gap',
      status: 'recognition-failed',
      instruction: '请再拖一次蓝车。',
    } as const;
    expect(feedbackForStep('first-gap', failed)).toEqual(failed);
    expect(feedbackForStep('second-gap', failed)).toBeUndefined();
  });
});
