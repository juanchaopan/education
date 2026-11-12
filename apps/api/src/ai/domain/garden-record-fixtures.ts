import type { LessonRecord, ScenePicture } from '@education/contracts';
import { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';

type Shot = (typeof gardenBalanceLesson.shots)[number];
type Placed = readonly [place: string, thing: string, count: number];

// A picture from what lies where and how it stands.
const picture = (placed: readonly Placed[], ...states: string[]): ScenePicture => ({
  things: placed.map(([place, thing, count]) => ({ place, thing, count })),
  states,
});

const swapped = picture(
  [
    ['left-pan', 'cabbage', 1],
    ['right-pan', 'apple', 0],
    ['right-pan', 'group-of-three', 3],
  ],
  'level',
);
const swappedInTwos = picture(
  [
    ['left-pan', 'cabbage', 1],
    ['right-pan', 'apple', 0],
    ['right-pan', 'group-of-two', 3],
    ['basket', 'cucumber', 2],
  ],
  'level',
  'two-each-sign',
);

// The garden balance's pictures as its page records them at the end of each
// scene, a scene the child leaves by a move ending with the picture that move
// leaves, and the key actions a child takes to get there, for tests of what
// the teacher is told.
export const gardenPictures: Readonly<Record<Shot, ScenePicture>> = {
  leaves: picture(
    [
      ['left-pan', 'cabbage', 1],
      ['right-pan', 'apple', 6],
      ['basket', 'cabbage', 1],
      ['basket', 'apple', 0],
    ],
    'apples-down',
  ),
  apples: picture(
    [
      ['left-pan', 'cabbage', 1],
      ['right-pan', 'apple', 3],
      ['basket', 'cabbage', 1],
      ['basket', 'apple', 3],
    ],
    'level',
  ),
  exchange: picture(
    [
      ['left-pan', 'apple', 1],
      ['right-pan', 'cucumber', 3],
    ],
    'level',
  ),
  bridge: swapped,
  answer: swapped,
  variation: swappedInTwos,
  end: swappedInTwos,
};

const gardenActions: LessonRecord['actions'] = [
  { stepId: 'leaves', action: 'cabbage-to-basket', times: 1 },
  { stepId: 'apples', action: 'apple-to-basket', times: 3 },
  { stepId: 'exchange', action: 'apple-tapped', times: 1 },
  { stepId: 'bridge', action: 'apple-swapped', times: 3 },
  { stepId: 'variation', action: 'apple-swapped', times: 3 },
];

// The record a page that played the garden from its start sends from a
// scene, the picture on screen being the one the scene ends with.
export function gardenRecordAt(shot: Shot): LessonRecord {
  const { shots } = gardenBalanceLesson;
  const before: readonly string[] = shots.slice(0, shots.indexOf(shot));
  return {
    now: gardenPictures[shot],
    ended: before.map((stepId) => ({ stepId, picture: gardenPictures[stepId as Shot] })),
    actions: gardenActions.filter(({ stepId }) => before.includes(stepId)),
  };
}
