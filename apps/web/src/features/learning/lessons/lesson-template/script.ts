import type { CountWords } from '../../interaction/spoken-answer';
import ask from './assets/ask.mp3';
import bye from './assets/bye.mp3';
import look from './assets/look.mp3';

// The template for a new lesson, copied to `lessons/<problem id>/` and
// `components/<problem id>/`; see the handbook's 从模板加一道题. It is never
// registered, so no child sees it.

// The problem version this lesson teaches, as the catalog lists it. A
// lesson's folder is named by its problem id.
export const templateProblem = { id: 'lesson-template', version: 1 } as const;

// The teacher's lines, each with its recording, made by
// `npm run lesson:narrate -- <lesson folder>`. The text is shown as the
// subtitle and stays readable when the sound cannot play.
export const lines = {
  look: { text: '桌上有两颗小石子。把它们一颗一颗放进碗里。', clip: look },
  ask: { text: '碗里一共有几颗小石子？', clip: ask },
  bye: { text: '数对了。换一种东西，也能这样一个一个地数。', clip: bye },
} as const;

export type LineId = keyof typeof lines;

// The scenes in teaching order. Each one is a step of the problem: its id is
// what a draft saves, what a question is asked about and what speech
// recognition is told to expect, and the plugin has a step of the same name.
export const shots = ['look', 'count', 'after'] as const;
export type Shot = (typeof shots)[number];

// What the teacher says on arriving at a scene, whether by playing on or by
// coming back to a saved one.
export const entryLines: Record<Shot, readonly LineId[]> = {
  look: ['look'],
  count: ['ask'],
  after: ['bye'],
};

export const answerQuestion = '碗里一共有几颗小石子？';
export const answerChoices = [1, 2, 3, 4, 5] as const;
// The plugin's hints, in the order a child who asks again receives them.
export const answerHints = ['count-again'] as const;

// The count is said in pebbles, 颗; a wrong count sends the child back to the
// bowl.
export const answerWords: CountWords = {
  unit: '颗',
  explain: (count) => `${count} 颗还不对。一颗一颗地数数碗里的小石子。`,
};
