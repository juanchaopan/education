import type { LessonBoard } from '../lesson-board';
import { tilt, type GardenState } from './garden-story';
import type { Shot } from './script';

type Picture = 'cabbage' | 'apple' | 'cucumber' | 'group';

// The conclusions the garden keeps on its board, each found in one scene and
// needed in the scenes after it. The opening's two cabbages and six apples
// are replaced by the first conclusion and stay on the opening scale only.
// One cabbage weighs three apples once the halved scale is level, and one
// apple weighs three cucumbers once its cucumbers show; the swaps use the
// second, and leave one cabbage weighing three groups, on which the count of
// nine is written once the child has said it. The variation's two cucumbers
// to an apple stand beside the three they change.
export const gardenBoard = {
  pictures: {
    cabbage: <use href="#garden-cabbage" />,
    apple: <use href="#garden-apple" />,
    cucumber: <use href="#garden-cucumber" />,
    group: <use href="#garden-group" />,
  },
  conclusions: [
    {
      id: 'cabbage-apples',
      says: '1 棵青菜和 3 个苹果一样重',
      amounts: [
        [1, 'cabbage'],
        [3, 'apple'],
      ],
      from: 'apples',
      found: (state) => tilt(state) === 0,
      hints: ['one-cabbage'],
    },
    {
      id: 'apple-cucumbers',
      says: '1 个苹果和 3 根黄瓜一样重',
      amounts: [
        [1, 'apple'],
        [3, 'cucumber'],
      ],
      from: 'exchange',
      found: ({ revealed }) => revealed,
      uses: ['bridge', 'end'],
      hints: ['count-groups'],
    },
    {
      id: 'apple-two-cucumbers',
      says: '假如 1 个苹果和 2 根黄瓜一样重',
      amounts: [
        [1, 'apple'],
        [2, 'cucumber'],
      ],
      from: 'variation',
      uses: ['variation', 'end'],
      supposed: true,
    },
    {
      id: 'cabbage-groups',
      says: '1 棵青菜和 3 组黄瓜一样重',
      amounts: [
        [1, 'cabbage'],
        [3, 'group'],
      ],
      from: 'answer',
      uses: ['answer'],
      hints: ['count-groups'],
      answer: { amount: [9, 'cucumber'], says: '1 棵青菜和 3 组黄瓜一样重，一共 9 根黄瓜' },
    },
  ],
} satisfies LessonBoard<GardenState, Shot, Picture>;
