import type { RailState } from './rail-story';
import type { Shot } from './script';

// What the derivation board says: the step it grew from, the current step,
// a line for each case, and a short reading of it.
export type Derivation = Readonly<{
  before?: string;
  now: readonly [string, ...string[]];
  note?: string;
}>;

const rate = '每秒追回 2 − 1 = 1 格';
const twoSeconds = '走 2 秒，追回 2 格';
const threeSeconds = '走 3 秒，蓝车领先 10 − 3 = 7 格';
const rest = '蓝车领先 = 10 − t';
const distance = '距离 = |10 − t|';
const equation = '|10 − t| = 4';
const blueAhead = '蓝车在前：10 − t = 4';
const yellowAhead = '黄车在前：10 − t = −4';
const faster = '假如黄车每秒走 3 格';

const restNote = '一开始领先十格，每秒少一格';
const minusOne: Derivation = {
  before: rest,
  now: ['10 − 11 = −1'],
  note: '蓝车领先 −1 格：黄车反过来领先 1 格',
};
const cases: Derivation = { before: equation, now: [blueAhead, yellowAhead] };
const sixth: Derivation = { before: blueAhead, now: ['t = 6'] };
const guessing: Derivation = {
  before: equation,
  now: [faster],
  note: '蓝车还是每秒 1 格，一开始还隔 10 格',
};

// Each scene's board, before and once the cars reach its stop, or as its
// taps go on. A step is written once the scene has shown it, and the times
// only once the child has answered and the cars stop at them.
const boards: Readonly<Record<Shot, (state: RailState) => Derivation | undefined>> = {
  story: () => undefined,
  speed: () => undefined,
  question: () => undefined,
  'start-gap': () => undefined,
  'one-second': ({ stopped }) =>
    stopped ? { now: [rate], note: '黄车多走的一格，就是追回的一格' } : undefined,
  'two-seconds': ({ stopped }) =>
    stopped
      ? { before: rate, now: [twoSeconds], note: '蓝车还领先 10 − 2 = 8 格' }
      : { now: [rate] },
  'three-seconds': ({ stopped }) =>
    stopped
      ? { before: twoSeconds, now: ['走 3 秒，追回 3 格'], note: '蓝车还领先 10 − 3 = 7 格' }
      : { before: rate, now: [twoSeconds], note: '蓝车还领先 10 − 2 = 8 格' },
  'name-t': ({ taps }) =>
    taps ? { before: threeSeconds, now: [rest], note: restNote } : { now: [threeSeconds] },
  'catch-up': ({ stopped }) =>
    stopped
      ? { before: rest, now: ['10 − 10 = 0'], note: '两个点对齐了，谁也不领先' }
      : { now: [rest], note: restNote },
  past: ({ stopped }) => (stopped ? minusOne : { before: rest, now: ['10 − 10 = 0'] }),
  distance: ({ stopped }) =>
    stopped
      ? {
          before: '10 − 12 = −2：黄车领先 2 格',
          now: [distance],
          note: '|10 − 3| = 7　|10 − 12| = 2',
        }
      : minusOne,
  equation: ({ taps }) =>
    taps
      ? { before: distance, now: [equation], note: '左边是距离，右边是题目要的四格' }
      : { now: [distance] },
  'two-ways': ({ taps }) => {
    if (taps === 0) return { now: [equation], note: '绝对值等于四：两个点隔着四格' };
    return taps === 1 ? { before: equation, now: [blueAhead] } : cases;
  },
  solve: () => cases,
  'check-six': ({ stopped }) => (stopped ? sixth : cases),
  'check-fourteen': ({ stopped }) =>
    stopped
      ? { before: yellowAhead, now: ['t = 6 或 t = 14'], note: '两个时刻，方向相反，距离一样' }
      : sixth,
  vary: () => guessing,
  'vary-seven': ({ stopped }) =>
    stopped
      ? { before: '假如每秒追回 3 − 1 = 2 格', now: ['|10 − 2t| = 4'], note: 't = 3 或 t = 7' }
      : guessing,
};

// What the derivation board says in a state of the film; the title card
// shows none.
export function derivationOf(state: RailState): Derivation | undefined {
  return state.shot === 'opening' ? undefined : boards[state.shot](state);
}
