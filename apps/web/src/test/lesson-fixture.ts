import { lessonContent } from '@education/problems/lesson-content';
import { storyLook } from '../features/learning/components/lesson-stage/story-look';
import type { Reaction } from '../features/learning/interaction/lesson-film';
import type { LessonDefinition } from '../features/learning/lessons/lesson-definition';
import { narratedScript } from '../features/learning/lessons/lesson-script';
import { FixtureScene, type FixtureShot, type FixtureState } from './FixtureScene';

// A small lesson for testing the shared lesson page: the child taps a pebble
// to move from looking to counting, counts in the answer scene, then hears
// the closing line. It takes its names and palette from the lesson stage's
// own story look and its pictures from the library, and is never registered
// as a problem.

type Move = 'tap';

export const fixtureContent = lessonContent({
  problem: { id: 'fixture', version: 1 },
  flow: 'scene-by-scene',
  vocabulary: ['小石子'],
  shots: ['look', 'count', 'after'],
  lines: {
    hello: { scene: 'look', text: '看看这颗小石子。' },
    ask: { scene: 'count', text: '一共有几颗？' },
    bye: { scene: 'after', text: '数完了。' },
  },
  scenes: {
    look: { prompt: '桌上有一颗小石子。孩子点一点它。', entry: ['hello'] },
    count: { prompt: '孩子要说出一共有几颗小石子。', entry: ['ask'] },
    after: { prompt: '孩子数完了。', entry: ['bye'] },
  },
  conclusions: [],
});

const script = narratedScript(fixtureContent, {
  hello: '/fixture/hello.mp3',
  ask: '/fixture/ask.mp3',
  bye: '/fixture/bye.mp3',
});

type Line = keyof typeof script.lines;

function arrive(shot: FixtureShot): Reaction<FixtureState, FixtureShot, Line> {
  return { state: { shot }, say: script.entryLines[shot], chime: [] };
}

const { place, ground } = storyLook.teacher;

export const fixtureLesson = {
  content: fixtureContent,
  title: storyLook.title,
  theater: storyLook.theater,
  labels: { film: storyLook.label, world: storyLook.worldLabel },
  backdrop: 'garden-morning',
  teacher: { id: 'rabbit', place, ground },
  // The pebble, round its centre.
  staging: { x: 570, y: 370, width: 60, height: 60 },
  palette: storyLook.palette,
  script,
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
