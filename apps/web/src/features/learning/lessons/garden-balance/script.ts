import { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import type { CountWords } from '../../interaction/spoken-answer';
import { narratedScript } from '../lesson-script';
import balanced from './assets/balanced.mp3';
import bridge from './assets/bridge.mp3';
import bridgeDone from './assets/bridge-done.mp3';
import bridgeOne from './assets/bridge-one.mp3';
import bridgeTwo from './assets/bridge-two.mp3';
import change from './assets/change.mp3';
import changeDone from './assets/change-done.mp3';
import clue from './assets/clue.mp3';
import halve from './assets/halve.mp3';
import hello from './assets/hello.mp3';
import one from './assets/one.mp3';
import question from './assets/question.mp3';
import three from './assets/three.mp3';
import tip from './assets/tip.mp3';

// The rabbit's lines, each with its recorded narration, the scenes in
// teaching order and what the rabbit says on arriving at each. The words and
// scenes are the lesson's content in @education/problems; the text is shown
// as the caption while a line plays and stays readable when the sound cannot
// play. Each scene is a step of the problem: its id is what a draft saves,
// what a question is asked about and what speech recognition is told to
// expect.
export const { lines, shots, entryLines } = narratedScript(gardenBalanceLesson, {
  hello,
  clue,
  question,
  tip,
  halve,
  balanced,
  one,
  three,
  bridge,
  bridgeOne,
  bridgeTwo,
  bridgeDone,
  change,
  changeDone,
});

export type LineId = keyof typeof lines;
export type Shot = (typeof shots)[number];

export const answerQuestion = '一棵青菜和几根黄瓜一样重？';
export const answerChoices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
// The authored hints, in the order a child who asks again receives them.
export const answerHints = ['one-cabbage', 'count-groups'] as const;

// What a wrong count most likely is, so the child sees what to look at again.
const mistakes: Readonly<Record<number, string>> = {
  3: '3 是一个苹果换的根数。右盘有三组黄瓜，再数数一共有几根。',
  6: '6 是一开始苹果的个数。现在右盘都是黄瓜了，数数有几根。',
};

// The count is said in cucumbers, 根.
export const answerWords: CountWords = {
  unit: '根',
  explain: (count) => mistakes[count] ?? `${count} 根还不对。一组一组地数数右盘的黄瓜，再告诉我。`,
};
