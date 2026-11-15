import type { Book } from './books.js';
import { sceneSteps, variationReason, wholeNumberAnswer } from './lesson-rules.js';
import {
  lessonTemplateLesson,
  templateVariationChoices,
  type TemplateVariationChoice,
} from './lessons/lesson-template.js';
import type { ProblemPlugin } from './plugin.js';

// The plugin of the template lesson, copied to `<problem id>.ts` together with
// its content in lessons/ and the lesson's folders, and registered in
// server.ts; see the handbook's 从模板加一道题. This one is never registered,
// so no catalog lists it and no child sees it.

// Two pebbles go into the bowl one at a time, and the child counts them.
const answer = 2;
// The variation puts three pebbles in instead.
const variationAnswer = 3;

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

// One more pebble went in, said without denying it; what stayed the same may
// be said with a negation, such as 「放法没有变」, so only a denial of the
// change itself, 「不是三颗」 or 「没有多」, makes a reason not clear.
const onePebbleMore = /多了?一颗|三颗|3\s*颗/;
const deniesTheChange = /不是三颗|没有多/;

const kept: readonly TemplateVariationChoice[] = ['one-by-one'];
const changed: readonly TemplateVariationChoice[] = ['count'];

// Every hint first says what the child is looking for.
export const lessonTemplate: ProblemPlugin = {
  summary: {
    ...lessonTemplateLesson.problem,
    title: '碗里有几颗小石子',
    book: lessonTemplateBook.id,
    sequence: 1,
  },
  answering: {
    hints: { 'count-again': '我们在找碗里有几颗小石子。一颗一颗地数，数到最后一颗是几？' },
    checkCompletion: wholeNumberAnswer(answer),
  },
  variation: {
    hints: {
      'count-three': '我们在找桌上有三颗小石子时，碗里一共有几颗。一颗一颗地数一数碗里的小石子。',
    },
    checkGuess: wholeNumberAnswer(variationAnswer),
    checkReason: variationReason({
      says: (text) =>
        onePebbleMore.test(text) && !deniesTheChange.test(text) ? 'correct' : 'incorrect',
      choices: Object.keys(templateVariationChoices),
      kept,
      changed,
    }),
  },
  feedback: lessonTemplateSteps,
  lesson: lessonTemplateLesson,
};
