import { entryLines, type LineId, type Shot } from './script';

export type Scene = Shot | 'opening';
export type GardenState = Readonly<{
  shot: Scene;
  // Cabbages on the left pan, apples on the right, while the scale is halved.
  leaves: number;
  apples: number;
  // Whether the single apple has shown the cucumbers it weighs.
  revealed: boolean;
  // Apples already swapped for a group of cucumbers.
  replaced: number;
}>;

// What one of the child's moves changes: the next state, the lines the rabbit
// says, the tones that mark it, and the scene that follows once the lines end.
export type Reaction = Readonly<{
  state: GardenState;
  say: readonly LineId[];
  chime: readonly number[];
  then?: Shot;
}>;

type Drop = { kind: 'drop'; part: 'leaf' | 'apple'; place: 'basket' };
type Tap = { kind: 'tap'; part: 'exchange' | 'replace' };
export type Move = Drop | Tap;

export const opening: GardenState = {
  shot: 'opening',
  leaves: 2,
  apples: 6,
  revealed: false,
  replaced: 0,
};

const balancedApples = 3;
const groups = 3;

// A scene as it first appears, which is also where a saved lesson resumes.
export function arrive(shot: Shot): Reaction {
  const state: GardenState = {
    ...opening,
    shot,
    leaves: shot === 'leaves' ? 2 : 1,
    apples: shot === 'leaves' || shot === 'apples' ? 6 : balancedApples,
    replaced: shot === 'answer' || shot === 'end' ? groups : 0,
  };
  return { state, say: entryLines[shot], chime: [] };
}

// Cucumbers that weigh one apple: three in the problem, two in the variation.
export function cucumbersPerApple(shot: Scene) {
  return shot === 'variation' || shot === 'end' ? 2 : 3;
}

// The beam tilts by the weight it carries. While cabbages and apples are
// weighed, each apple beyond the three that balance one cabbage lowers the
// apple side; the single apple outweighs the empty pan until its cucumbers
// appear. Every swap of an apple for its cucumbers keeps the beam level.
export function tilt({ shot, apples, revealed }: GardenState) {
  if (shot === 'apples') return Math.max(0, Math.min(33, (apples - balancedApples) * 11));
  if (shot === 'exchange') return revealed ? 0 : -22;
  return 0;
}

function react(state: GardenState, chime: readonly number[], say: readonly LineId[] = []) {
  return { state, say, chime };
}

function replaceApple(state: GardenState): Reaction | undefined {
  if (state.replaced >= groups) return;
  const replaced = state.replaced + 1;
  const next = { ...state, replaced };
  const chime = [390 + replaced * 40, 490 + replaced * 50];
  if (state.shot === 'variation')
    return replaced === groups ? { ...arrive('end'), chime } : react(next, chime);
  if (replaced === 1) return react(next, chime, ['bridgeOne']);
  if (replaced === 2) return react(next, chime, ['bridgeTwo']);
  return { ...arrive('answer'), chime };
}

function dropApple(state: GardenState): Reaction | undefined {
  if (state.apples <= balancedApples) return;
  const apples = state.apples - 1;
  const next = { ...state, apples };
  if (apples > balancedApples) return react(next, [270 + apples * 20]);
  return { ...react(next, [415, 554, 659], ['balanced']), then: 'exchange' };
}

function drop(state: GardenState, { part }: Drop): Reaction | undefined {
  if (state.shot === 'leaves' && part === 'leaf') return { ...arrive('apples'), chime: [290] };
  if (state.shot === 'apples' && part === 'apple') return dropApple(state);
}

function tap(state: GardenState, { part }: Tap): Reaction | undefined {
  const { shot } = state;
  if (part === 'exchange' && shot === 'exchange' && !state.revealed)
    return { ...react({ ...state, revealed: true }, [360, 440, 540], ['three']), then: 'bridge' };
  if (part === 'replace' && (shot === 'bridge' || shot === 'variation')) return replaceApple(state);
}

// The rules of each scene: only the current prop moves the story on, and any
// other move changes nothing.
export function respond(state: GardenState, move: Move): Reaction | undefined {
  return move.kind === 'drop' ? drop(state, move) : tap(state, move);
}

// Scenes before the answer are work in progress; once the count is answered
// the rest of the lesson is practice that needs no saving.
export function savesProgress(shot: Scene): shot is Shot {
  return shot !== 'opening' && shot !== 'variation' && shot !== 'end';
}
