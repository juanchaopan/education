import type { KeyActionOf, ScenePictureOf } from '@education/problems/lesson-content';
import type { railChaseLesson } from '@education/problems/lessons/rail-chase';
import type { LessonRecording } from '../../interaction/lesson-record';
import { boardStepsOf } from './rail-board';
import { runs, type Move, type RailState } from './rail-story';
import { positions, speedOf, starts, wonBack } from './rail-track';
import { railView } from './rail-view';
import type { Shot } from './script';

// How the rail chase tells the teacher what is on screen and what the child
// did, in the words its content declares.
type Picture = ScenePictureOf<typeof railChaseLesson>;
type Action = KeyActionOf<typeof railChaseLesson>;
type PictureState = Picture['states'][number];
type OnScene = RailState & Readonly<{ shot: Shot }>;

const startSquares = starts.blue - starts.yellow;

// Who is in front, from the gap between the midpoints.
function inFront(gap: number): PictureState {
  if (gap === 0) return 'lined-up';
  return gap > 0 ? 'blue-in-front' : 'yellow-in-front';
}

// The tracks with the seconds driven and each car's speed, the squares
// between the midpoints and the start strip once they are drawn, and the
// two small pictures while the child lights them.
function things(state: OnScene): Picture['things'] {
  const { shot, t } = state;
  const view = railView(state);
  const won = wonBack(t, shot);
  return [
    { place: 'tracks', thing: 'second', count: t },
    { place: 'yellow-car', thing: 'square-a-second', count: speedOf('yellow', shot) },
    { place: 'blue-car', thing: 'square-a-second', count: speedOf('blue', shot) },
    ...(view.drops
      ? [{ place: 'between', thing: 'square', count: Math.abs(positions(t, shot).gap) } as const]
      : []),
    ...(view.strip
      ? ([
          { place: 'start-strip', thing: 'gold-square', count: won },
          { place: 'start-strip', thing: 'plain-square', count: startSquares - won },
        ] as const)
      : []),
    ...(view.ways === undefined
      ? []
      : [{ place: 'side-pictures', thing: 'lit-picture', count: view.ways } as const]),
  ];
}

// Who is in front, the newest lines of the derivation board, and the mark
// of four squares apart when the cars stop at a time.
function states(state: OnScene): PictureState[] {
  return [
    inFront(positions(state.t, state.shot).gap),
    ...boardStepsOf(state).map((step) => `board-${step}` as const),
    ...(railView(state).ruler ? (['four-apart-mark'] as const) : []),
  ];
}

function picture(state: RailState): Picture {
  const { shot } = state;
  if (shot === 'opening') return { things: [], states: [] };
  const scene = { ...state, shot };
  return { things: things(scene), states: states(scene) };
}

const isCar = (part: string) => part === 'yellow-car' || part === 'blue-car';

// A push of the cars: one taken, one made once they have stopped, or one in
// a scene where they do not move.
function pushed({ shot, stopped }: OnScene, taken: boolean): Action | undefined {
  if (taken) return 'push';
  if (!runs[shot]) return 'push-still';
  return stopped ? 'push-at-stop' : undefined;
}

// Each push and each tap the scene takes is a key action; a push the cars
// do not answer and a tap of a part the scene is not waiting for are the
// common slips. A car tapped where the cars are pushed is a push.
function action(state: RailState, move: Move, taken: boolean): Action | undefined {
  const { shot } = state;
  if (shot === 'opening') return;
  const scene = { ...state, shot };
  if (move.kind !== 'tap' || (runs[shot] && isCar(move.part))) return pushed(scene, taken);
  return taken ? `tap-${move.part}` : 'wrong-tap';
}

export const railRecording = { picture, action } satisfies LessonRecording<RailState, Move>;
