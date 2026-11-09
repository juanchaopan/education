import { uncertainFeedback, type TeachingFeedback } from '@education/contracts';
import { sceneSteps, wholeNumberAnswer } from './lesson-rules.js';
import type { ProblemPlugin } from './plugin.js';

// 一年级试卷第 7 题：两棵青菜和六个苹果一样重，一个苹果和三根黄瓜一样重，
// 一棵青菜和几根黄瓜一样重？The child halves the scale to find that one cabbage
// weighs three apples, then swaps each apple for three cucumbers: nine.
const answer = 9;

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to notice next. None of them states the final count.
export const gardenBalanceSteps = sceneSteps(
  ['青菜', '苹果', '黄瓜', '天平', '秤盘', '一样重', '一组', '每组', '几根'],
  {
    leaves:
      '天平左盘有两棵青菜，右盘有六个苹果，天平是平的。孩子要把一棵青菜拖进旁边的篮子，看看只称一棵会怎样。',
    apples:
      '左盘只剩一棵青菜，右盘还有六个苹果，苹果这边沉下去了。孩子要一个个拿走苹果，直到天平回到中间，发现一棵青菜和几个苹果一样重。',
    exchange:
      '天平一边是一个苹果。孩子碰一碰苹果，看到另一边出现几根黄瓜时天平变平，发现一个苹果和几根黄瓜一样重。',
    bridge:
      '左盘是一棵青菜，右盘是和它一样重的三个苹果。孩子把苹果一个个换成和它一样重的一组黄瓜，每换一次天平都还是平的。',
    answer:
      '三个苹果都换成了黄瓜，右盘有三组黄瓜，每组三根，和一棵青菜一样重。孩子要说出一棵青菜和几根黄瓜一样重。',
    variation:
      '换个条件：每个苹果只换两根黄瓜，还是三个苹果。孩子先猜一猜会有几组、一共几根，再点苹果看看。',
    end: '三个苹果换成了三组黄瓜，每组两根。孩子要说说什么没变（组数还是三组），什么变了（每组的根数）。',
  },
);

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
    id: 'garden-balance',
    version: 1,
    title: '一棵青菜有多重',
    grade: '一年级',
    subject: '数学',
    category: '学而思',
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
