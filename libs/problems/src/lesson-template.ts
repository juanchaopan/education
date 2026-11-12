import type { Book } from './books.js';
import { sceneSteps, wholeNumberAnswer } from './lesson-rules.js';
import { lessonTemplateLesson } from './lessons/lesson-template.js';
import type { ProblemPlugin } from './plugin.js';

// The plugin of the template lesson, copied to `<problem id>.ts` together with
// its content in lessons/ and the lesson's folders, and registered in
// server.ts; see the handbook's 从模板加一道题. This one is never registered,
// so no catalog lists it and no child sees it.

// Two pebbles go into the bowl one at a time, and the child counts them.
const answer = 2;

// The template's own book, which only its test registers. A copied lesson
// names the maintained book it is filed in instead.
export const lessonTemplateBook: Book = {
  id: 'lesson-template',
  grade: '一年级',
  subject: '数学',
  category: '模板',
};

// What a model may see for each scene: the scene as the child sees it and what
// the child is meant to do or notice next.
export const lessonTemplateSteps = sceneSteps(lessonTemplateLesson);

export const lessonTemplate: ProblemPlugin = {
  summary: {
    ...lessonTemplateLesson.problem,
    title: '碗里有几颗小石子',
    book: lessonTemplateBook.id,
    sequence: 1,
  },
  answering: {
    hints: { 'count-again': '一颗一颗地数碗里的小石子，数到最后一颗是几？' },
    checkCompletion: wholeNumberAnswer(answer),
  },
  feedback: lessonTemplateSteps,
};
