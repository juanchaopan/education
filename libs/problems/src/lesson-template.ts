import { sceneSteps, wholeNumberAnswer } from './lesson-rules.js';
import type { ProblemPlugin } from './plugin.js';

// The plugin of the template lesson, copied to `<problem id>.ts` together with
// the lesson's folders and registered in server.ts; see the handbook's
// 从模板加一道题. This one is never registered, so no catalog lists it and
// no child sees it.

// Two pebbles go into the bowl one at a time, and the child counts them.
const answer = 2;

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to do or notice next.
export const lessonTemplateSteps = sceneSteps(['小石子', '碗', '一颗', '几颗'], {
  look: '桌上有小石子，旁边有一个碗。孩子要把小石子一颗一颗放进碗里。',
  count: '小石子都放进了碗里。孩子要说出碗里一共有几颗小石子。',
  after: '孩子数对了碗里的小石子。这一幕说说换一种东西也能一个一个地数。',
});

export const lessonTemplate: ProblemPlugin = {
  summary: {
    id: 'lesson-template',
    version: 1,
    title: '碗里有几颗小石子',
    grade: '一年级',
    subject: '数学',
    category: '模板',
    sequence: 1,
  },
  answering: {
    hints: { 'count-again': '一颗一颗地数碗里的小石子，数到最后一颗是几？' },
    checkCompletion: wholeNumberAnswer(answer),
  },
  feedback: lessonTemplateSteps,
};
