import { storyLook } from '../features/learning/components/lesson-stage/story-look';
import type { Reaction } from '../features/learning/interaction/lesson-film';
import type { LessonDefinition } from '../features/learning/lessons/lesson-definition';
import { FixtureScene, type FixtureShot, type FixtureState } from './FixtureScene';

// A small lesson for testing the shared lesson page: the child taps a pebble
// to move from looking to counting, counts in the answer scene, then hears
// the closing line. It takes its names and palette from the lesson stage's
// own story look and its pictures from the library, and is never registered
// as a problem.

type Line = 'hello' | 'ask' | 'bye';
type Move = 'tap';

const lines = {
  hello: { text: '看看这颗小石子。', clip: '/fixture/hello.mp3' },
  ask: { text: '一共有几颗？', clip: '/fixture/ask.mp3' },
  bye: { text: '数完了。', clip: '/fixture/bye.mp3' },
};

const entryLines: Record<FixtureShot, readonly Line[]> = {
  look: ['hello'],
  count: ['ask'],
  after: ['bye'],
};

function arrive(shot: FixtureShot): Reaction<FixtureState, FixtureShot, Line> {
  return { state: { shot }, say: entryLines[shot], chime: [] };
}

const { place, ground } = storyLook.teacher;

export const fixtureLesson = {
  problem: { id: 'fixture', version: 1 },
  title: storyLook.title,
  theater: storyLook.theater,
  labels: { film: storyLook.label, world: storyLook.worldLabel },
  backdrop: 'garden-morning',
  teacher: { id: 'rabbit', place, ground },
  // The pebble, round its centre.
  staging: { x: 570, y: 370, width: 60, height: 60 },
  palette: storyLook.palette,
  script: { lines, shots: ['look', 'count', 'after'], entryLines },
  story: {
    opening: { shot: 'opening' },
    arrive,
    respond: (state, move) =>
      state.shot === 'look' && move === 'tap' ? arrive('count') : undefined,
    savesProgress: (shot) => shot !== 'after',
  },
  props: {
    lifts: {},
    drop: () => undefined,
    tap: (part) => (part === 'pebble' ? 'tap' : undefined),
    carried: () => null,
  },
  answer: {
    shot: 'count',
    question: '一共有几颗小石子？',
    words: { unit: '颗', explain: (count) => `${count} 颗还不对。` },
    choices: [1, 2, 3],
    hints: ['look-again'],
  },
  Scene: FixtureScene,
} satisfies LessonDefinition<FixtureState, FixtureShot, Line, Move, never, object>;
