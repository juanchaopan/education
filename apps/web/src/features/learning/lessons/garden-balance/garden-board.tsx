import type { PictureOf } from '@education/problems/lesson-content';
import type { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import type { LessonBoard } from '../lesson-board';
import { tilt, type GardenState } from './garden-story';

// How the garden draws the conclusions its scenes find, which are declared in
// the lesson's content: each thing with the same symbol the scale shows and
// the shape its copies pile up in, and the moment the first two are found
// within their scene. A group of cucumbers is no thing of its own: the board
// frames the cucumbers, as the swaps frame them on the scale. One cabbage
// weighs three apples once the halved scale is level, and one apple weighs
// three cucumbers once its cucumbers show.
export const gardenBoard = {
  pictures: {
    cabbage: { art: <use href="#garden-cabbage" />, shape: 'round' },
    apple: { art: <use href="#garden-apple" />, shape: 'round' },
    cucumber: { art: <use href="#garden-cucumber" />, shape: 'long' },
  },
  found: {
    'cabbage-apples': (state) => tilt(state) === 0,
    'apple-cucumbers': ({ revealed }) => revealed,
  },
} satisfies LessonBoard<GardenState, PictureOf<typeof gardenBalanceLesson>>;
