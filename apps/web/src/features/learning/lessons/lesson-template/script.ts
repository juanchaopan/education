import { lessonTemplateLesson } from '@education/problems/lessons/lesson-template';
import type { CountWords } from '../../interaction/spoken-answer';
import { narratedScript } from '../lesson-script';
import ask from './assets/ask.mp3';
import look from './assets/look.mp3';
import place from './assets/place.mp3';
import reveal from './assets/reveal.mp3';
import three from './assets/three.mp3';
import why from './assets/why.mp3';

// The template for a new lesson, copied to `lessons/<problem id>/` and
// `components/<problem id>/`; see the handbook's 从模板加一道题. It is never
// registered, so no child sees it.

// The teacher's lines, each with its recording, made by
// `npm run lesson:narrate -- <lesson folder>`, the scenes in teaching order
// and what the teacher says on arriving at each. The words and scenes are the
// lesson's content in @education/problems; the text is shown as the subtitle
// and stays readable when the sound cannot play. Each scene is a step of the
// problem: its id is what a draft saves, what a question is asked about and
// what speech recognition is told to expect.
export const { lines, shots, entryLines } = narratedScript(lessonTemplateLesson, {
  look,
  ask,
  three,
  place,
  why,
  reveal,
});

export type LineId = keyof typeof lines;
export type Shot = (typeof shots)[number];

export const answerQuestion = '碗里一共有几颗小石子？';
export const answerChoices = [1, 2, 3, 4, 5] as const;
// The plugin's hints, in the order a child who asks again receives them.
export const answerHints = ['count-again'] as const;

// The count is said in pebbles, 颗; a wrong count sends the child back to the
// bowl.
export const answerWords: CountWords = {
  unit: '颗',
  explain: ([count]) => `${count} 颗还不对。一颗一颗地数数碗里的小石子。`,
};

// The variation's answers: the guess of how many pebbles the bowl holds
// once three go in, said in 颗 or tapped from the same numbers as the count;
// the reason, with what the teacher says when it is not clear; and the
// variation's own hint, in the plugin.
export const variationAnswer = {
  guess: { question: '假如桌上有三颗小石子，碗里一共有几颗？', unit: '颗', choices: answerChoices },
  reason: {
    question: '和你猜的一样吗？说说为什么。',
    unclear: '还没说清楚。看看碗里：小石子是怎样放进去的？一共放了几颗？再说一次。',
  },
  hints: ['count-three'],
} as const;
