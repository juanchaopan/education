import { numberSetAnswer, sceneSteps } from './lesson-rules.js';
import { railChaseLesson } from './lessons/rail-chase.js';
import type { ProblemPlugin } from './plugin.js';

// 六年级学而思讲义的数轴追及题：两车的中点 M、N 什么时候相距 4 格？The child
// derives |10 − t| = 4 by pushing the cars and gives both times. The lesson's
// scenes are declared in lessons/rail-chase.ts.
const times = [6, 14];

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to notice next.
export const railChaseSteps = sceneSteps(railChaseLesson);

export const railChase: ProblemPlugin = {
  summary: {
    ...railChaseLesson.problem,
    title: '两车的中点什么时候相距 4 格',
    book: 'g6-math-xueersi',
    sequence: 1,
  },
  answering: {
    hints: {
      'blue-ahead':
        '我们在找 M 和 N 相距四格的时刻。先看蓝车在前那一次：一开始领先十格，要追回几格，才只剩四格？每秒追回一格，追回几格就是第几秒。',
      'yellow-ahead':
        '我们在找 M 和 N 相距四格的时刻。再看黄车在前那一次：先追回十格，两个点对齐；再多追四格，黄车就领先四格。一共追回几格，就是第几秒。',
    },
    checkCompletion: numberSetAnswer(times),
  },
  feedback: railChaseSteps,
};
