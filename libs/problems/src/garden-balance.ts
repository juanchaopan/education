import { uncertainFeedback, type TeachingFeedback } from '@education/contracts';
import { sceneSteps, wholeNumberAnswer } from './lesson-rules.js';
import { gardenBalanceLesson } from './lessons/garden-balance.js';
import type { ProblemPlugin } from './plugin.js';

// 一年级试卷第 7 题：一棵青菜和几根黄瓜一样重？The child halves the scale to
// find that one cabbage weighs three apples, then swaps each apple for three
// cucumbers: nine. The lesson's scenes are declared in lessons/garden-balance.ts.
const answer = 9;

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to notice next.
export const gardenBalanceSteps = sceneSteps(gardenBalanceLesson);

// The groups staying three, and each group holding two, said the right way
// round; a negated or reversed answer matches neither and is left to the model.
const groupsKept = /(还是|仍然是|都是)三组|组数(没|不)变|三组没变/;
const countChanged = /(变成|只有|换成|每组)(两|二|2)根|根数变了/;
const negated = /不是|没有变成/;

// The closing question has a short authored answer: the groups stay three and
// each group holds fewer. Anything else is left to the model.
function checkStep({ stepId, answer: text }: { stepId: string; answer: string }): TeachingFeedback {
  if (stepId === 'end' && groupsKept.test(text) && countChanged.test(text) && !negated.test(text))
    return {
      status: 'correct',
      stepId,
      instruction: '说得对！还是三组，只是每组从三根变成了两根。',
    };
  return uncertainFeedback(stepId);
}

export const gardenBalance: ProblemPlugin = {
  summary: {
    ...gardenBalanceLesson.problem,
    title: '一棵青菜有多重',
    book: 'g1-math-xueersi',
    sequence: 7,
  },
  answering: {
    hints: {
      'one-cabbage': '先看第一架秤：一棵青菜和几个苹果一样重？',
      'count-groups': '数一数：右盘有三组黄瓜，每组三根。可以一组一组地数。',
    },
    checkCompletion: wholeNumberAnswer(answer),
  },
  feedback: gardenBalanceSteps,
  checkStep,
};
