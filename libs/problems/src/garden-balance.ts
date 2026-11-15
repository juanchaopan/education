import { sceneSteps, variationReason, wholeNumberAnswer } from './lesson-rules.js';
import {
  gardenBalanceLesson,
  gardenVariationChoices,
  type GardenVariationChoice,
} from './lessons/garden-balance.js';
import type { ProblemPlugin } from './plugin.js';

// 一年级试卷第 7 题：一棵青菜和几根黄瓜一样重？The child halves the scale to
// find that one cabbage weighs three apples, then swaps each apple for three
// cucumbers: nine. The lesson's scenes are declared in lessons/garden-balance.ts.
const answer = 9;
// The variation swaps each apple for two cucumbers instead: three groups of
// two, six.
const variationAnswer = 6;

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to notice next.
export const gardenBalanceSteps = sceneSteps(gardenBalanceLesson);

// The groups staying three, and each group holding two, said the right way
// round; a negated or reversed answer matches neither.
const groupsKept = /(还是|仍然是|都是)三组|组数(没|不)变|三组没变/;
const countChanged = /(变成了?|只有|换成了?|每组)(两|二|2)根|根数变了/;
const negated = /不是|没有变成/;

// Whether a sentence says what stays and what changes once each apple swaps
// for two cucumbers: still three groups, each holding fewer.
function explainsChange(text: string) {
  return groupsKept.test(text) && countChanged.test(text) && !negated.test(text);
}

const kept: readonly GardenVariationChoice[] = ['groups'];
const changed: readonly GardenVariationChoice[] = ['per-group'];

// Every hint first says what the child is looking for, then points at what
// the board keeps in sight: the first line when one cabbage's three apples
// are needed, and the groups on the right pan when the cucumbers are counted.
export const gardenBalance: ProblemPlugin = {
  summary: {
    ...gardenBalanceLesson.problem,
    title: '一棵青菜有多重',
    book: 'g1-math-xueersi',
    sequence: 7,
  },
  answering: {
    hints: {
      'one-cabbage':
        '我们在找一棵青菜和几根黄瓜一样重。看上面第一条：一棵青菜和三个苹果一样重，每个苹果都换成了一组黄瓜。',
      'count-groups':
        '我们在找一棵青菜和几根黄瓜一样重。右盘有三组黄瓜，每组三根，一组一组地数一数。',
    },
    checkCompletion: wholeNumberAnswer(answer),
  },
  // A reason that does not say both halves the right way round, such as
  // 「变成两组了」 or 「每组还是三根」, is not clear.
  variation: {
    hints: {
      'groups-and-count':
        '我们在找每个苹果只换两根时，一棵青菜和几根黄瓜一样重。数一数，现在有几组？每组有几根？',
    },
    checkGuess: wholeNumberAnswer(variationAnswer),
    checkReason: variationReason({
      says: (text) => (explainsChange(text) ? 'correct' : 'incorrect'),
      choices: Object.keys(gardenVariationChoices),
      kept,
      changed,
    }),
  },
  feedback: gardenBalanceSteps,
  lesson: gardenBalanceLesson,
};
