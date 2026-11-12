import type { PictureOf } from '@education/problems/lesson-content';
import type { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import type { LessonBoard } from '../lesson-board';
import { tilt, type GardenState } from './garden-story';

// How the garden draws the conclusions its scenes find, which are declared in
// the lesson's content: each amount with the garden's own symbols, and the
// moment the first two are found within their scene. One cabbage weighs
// three apples once the halved scale is level, and one apple weighs three
// cucumbers once its cucumbers show.
export const gardenBoard = {
  pictures: {
    cabbage: <use href="#garden-cabbage" />,
    apple: <use href="#garden-apple" />,
    cucumber: <use href="#garden-cucumber" />,
    group: <use href="#garden-group" />,
  },
  found: {
    'cabbage-apples': (state) => tilt(state) === 0,
    'apple-cucumbers': ({ revealed }) => revealed,
  },
} satisfies LessonBoard<GardenState, PictureOf<typeof gardenBalanceLesson>>;
