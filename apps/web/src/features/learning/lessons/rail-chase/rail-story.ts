import type { FilmScene, Reaction as FilmReaction } from '../../interaction/lesson-film';
import { atStop, nudgedFrom, pushedTo, type PushRun } from '../../interaction/push-run';
import type { Nudge } from '../../interaction/stage-activation';
import { entryLines, shots, type LineId, type Shot } from './script';

export type Scene = FilmScene<Shot>;
export type RailState = Readonly<{
  shot: Scene;
  // The seconds both cars have driven.
  t: number;
  // How many of the scene's taps the child has made, in their order.
  taps: number;
  // The cars stand at the scene's stop, where they wait for its lines.
  stopped: boolean;
}>;

type Reaction = FilmReaction<RailState, Shot, LineId>;

// What the child taps: a car, the squares between the two midpoints at the
// start or now, the start strip's squares still to win back, the 4 格 of
// the question, and the two small pictures of four squares apart.
export type Part =
  'yellow-car' | 'blue-car' | 'start-gap' | 'rest' | 'gap' | 'four' | 'blue-ahead' | 'yellow-ahead';

export type Move =
  { kind: 'drive'; to: number } | { kind: 'nudge'; nudge: Nudge } | { kind: 'tap'; part: Part };

// The scenes the child pushes the cars through: from where the scene begins
// to its stop. The stops before the answer are never 6 or 14 seconds.
export const runs: Readonly<Partial<Record<Shot, PushRun>>> = {
  'one-second': { from: 0, stop: 1 },
  'two-seconds': { from: 1, stop: 2 },
  'three-seconds': { from: 2, stop: 3 },
  'catch-up': { from: 3, stop: 10 },
  past: { from: 10, stop: 11 },
  distance: { from: 11, stop: 12 },
  'check-six': { from: 0, stop: 6 },
  'check-fourteen': { from: 6, stop: 14 },
  vary: { from: 0, stop: 3 },
  'vary-seven': { from: 3, stop: 7 },
};

// Where the cars stand in the scenes the child does not push them through.
const parked: Readonly<Partial<Record<Shot, number>>> = {
  'name-t': 3,
  equation: 12,
  'two-ways': 12,
  solve: 12,
};

// What the owl says once the cars reach a scene's stop, and the scene that
// follows once it is said; a scene without one waits for a tap.
const stops: Readonly<Partial<Record<Shot, { say: readonly LineId[]; then?: Shot }>>> = {
  'one-second': { say: ['oneStop', 'oneCompare', 'oneGold'], then: 'two-seconds' },
  'two-seconds': { say: ['twoStop'], then: 'three-seconds' },
  'three-seconds': { say: ['threeStop'], then: 'name-t' },
  'catch-up': { say: ['catchMeet', 'catchAhead'], then: 'past' },
  past: { say: ['pastPassed', 'pastMinus'] },
  distance: { say: ['distanceAgain', 'distanceAbs', 'distanceCheck'], then: 'equation' },
  'check-six': { say: ['checkSix'], then: 'check-fourteen' },
  'check-fourteen': { say: ['checkFourteen', 'checkTwo'], then: 'vary' },
  vary: { say: ['varyStop'], then: 'vary-seven' },
  'vary-seven': { say: ['varyStopAgain', 'varyWhy', 'varyReveal'] },
};

// The parts the child taps in a scene, in order, what the owl says after
// each, and the scene that follows the last; `stopped` asks the cars to be
// at the scene's stop first.
type Taps = Readonly<{
  parts: readonly Part[];
  say: readonly (readonly LineId[])[];
  then: Shot;
  stopped?: boolean;
}>;

const taps: Readonly<Partial<Record<Shot, Taps>>> = {
  speed: {
    parts: ['yellow-car', 'blue-car'],
    say: [['speedYellow'], ['speedBlue', 'speedBoth']],
    then: 'question',
  },
  question: {
    parts: ['yellow-car', 'blue-car'],
    say: [[], ['questionAsk', 'questionFour', 'questionSteps']],
    then: 'start-gap',
  },
  'start-gap': { parts: ['start-gap'], say: [['startCount', 'startKeep']], then: 'one-second' },
  'name-t': { parts: ['rest'], say: [['nameRest', 'nameCheck']], then: 'catch-up' },
  past: { parts: ['gap'], say: [['pastWhy', 'pastSign']], then: 'distance', stopped: true },
  equation: { parts: ['four'], say: [['equationSet']], then: 'two-ways' },
  'two-ways': {
    parts: ['blue-ahead', 'yellow-ahead'],
    say: [['waysBlue'], ['waysYellow']],
    then: 'solve',
  },
};

// The title card: the cars wait at their start.
export const opening: RailState = { shot: 'opening', t: 0, taps: 0, stopped: false };

// A scene as it first appears, which is also where a saved lesson resumes:
// the cars at the scene's start. The opening scene tells the story and plays
// on by itself.
export function arrive(shot: Shot): Reaction {
  const t = runs[shot]?.from ?? parked[shot] ?? 0;
  return {
    state: { shot, t, taps: 0, stopped: false },
    say: entryLines[shot],
    chime: [],
    ...(shot === 'story' && { then: 'speed' as const }),
  };
}

// A soft tone each time the cars pass a whole second, a little higher each
// second, and a brighter chord at a stop.
const tick = (t: number) => [330 + Math.floor(t) * 18];
const stopTones = [523, 659, 784];

function driveTo(state: RailState, shot: Shot, to: number): Reaction | undefined {
  const run = runs[shot];
  if (!run || state.stopped) return;
  const t = pushedTo(run, to);
  if (t === state.t) return;
  const passed = Math.floor(t) !== Math.floor(state.t) ? tick(t) : [];
  if (!atStop(run, t)) return { state: { ...state, t }, say: [], chime: passed };
  const { say = [], then } = stops[shot] ?? {};
  return { state: { ...state, t, stopped: true }, say, chime: stopTones, then };
}

const isCar = (part: Part) => part === 'yellow-car' || part === 'blue-car';

// The next of a scene's taps, when it is the part the scene waits for.
function takeTap(state: RailState, scene: Taps, part: Part): Reaction | undefined {
  if (scene.parts[state.taps] !== part || (scene.stopped && !state.stopped)) return;
  const taken = state.taps + 1;
  return {
    state: { ...state, taps: taken },
    say: scene.say[state.taps] ?? [],
    chime: [440 + taken * 110],
    ...(taken === scene.parts.length && { then: scene.then }),
  };
}

// A tapped car drives a second on where the cars are pushed, and flashes its
// headlight in the opening story; anything else is one of the scene's taps.
function tapped(state: RailState, shot: Shot, part: Part): Reaction | undefined {
  const run = runs[shot];
  if (run && isCar(part)) return driveTo(state, shot, nudgedFrom(run, state.t, 1));
  if (shot === 'story' && isCar(part))
    return { state: { ...state, taps: state.taps + 1 }, say: [], chime: [880] };
  const scene = taps[shot];
  return scene && takeTap(state, scene, part);
}

// The rules of each scene: the cars move only in the scenes they are pushed
// through, halt at the stop and wait there for its lines; a tap counts only
// on the part the scene waits for next. Any other move changes nothing.
export function respond(state: RailState, move: Move): Reaction | undefined {
  const { shot } = state;
  if (shot === 'opening') return;
  if (move.kind === 'tap') return tapped(state, shot, move.part);
  const run = runs[shot];
  if (!run) return;
  const to = move.kind === 'drive' ? move.to : nudgedFrom(run, state.t, move.nudge);
  return driveTo(state, shot, to);
}

// Scenes up to the answer are work in progress; once both times are
// answered, the checks and the variation are practice that needs no saving.
export function savesProgress(shot: Scene): shot is Shot {
  return shot !== 'opening' && shots.indexOf(shot) <= shots.indexOf('solve');
}
