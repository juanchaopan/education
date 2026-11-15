import type { FilmScene, Reaction as FilmReaction } from '../../interaction/lesson-film';
import type { StageProps } from '../../interaction/useStageDrag';
import { entryLines, type LineId, type Shot } from './script';

// The scenes' rules, as pure functions the lesson's unit tests cover: what is
// on screen, how a scene first appears, and how it answers the child's moves.

export type TemplateState = Readonly<{
  shot: FilmScene<Shot>;
  // Pebbles the child has put in the bowl.
  inBowl: number;
}>;

// The child puts a pebble in the bowl, by dragging it there or tapping it and
// then the bowl.
export type Move = Readonly<{ kind: 'drop'; place: 'bowl' }>;

type Reaction = FilmReaction<TemplateState, Shot, LineId>;

// The variation's scenes, which have one pebble more.
const varied: readonly FilmScene<Shot>[] = ['guess', 'place', 'reason', 'reveal'];

// The pebbles on screen: two in the problem, three in the variation.
export function pebblesIn(shot: FilmScene<Shot>) {
  return varied.includes(shot) ? 3 : 2;
}

// The scenes where the child puts the pebbles in, and the scene each moves
// on to once the last one is in.
const putting: Readonly<Partial<Record<Shot, Shot>>> = { look: 'count', place: 'reason' };

// The scenes that open with every pebble in the bowl.
const filled: readonly Shot[] = ['count', 'reason', 'reveal'];

// The title card: the film starts with both pebbles on the table.
export const opening: TemplateState = { shot: 'opening', inBowl: 0 };

// A scene as it first appears, which is also where a saved lesson resumes.
export function arrive(shot: Shot): Reaction {
  const inBowl = filled.includes(shot) ? pebblesIn(shot) : 0;
  return { state: { shot, inBowl }, say: entryLines[shot], chime: [] };
}

// Each pebble put in the bowl rings; the last one moves on to the next scene.
// The pebbles rest while the child guesses.
export function respond(state: TemplateState, move: Move): Reaction | undefined {
  const next = state.shot === 'opening' ? undefined : putting[state.shot];
  if (!next || move.place !== 'bowl') return;
  const inBowl = state.inBowl + 1;
  if (inBowl < pebblesIn(state.shot)) return { state: { ...state, inBowl }, say: [], chime: [440] };
  return { ...arrive(next), chime: [440, 554] };
}

// The scenes up to the count are work worth saving; the variation is practice.
export const savesProgress = (shot: Shot) => shot === 'look' || shot === 'count';

// What the child picks up, how big it is while carried, and the move a drop
// on the bowl makes. Nothing in this lesson is only tapped.
export const pebbleLook = { size: 56 };

export const templateProps: StageProps<Move, { pebble: typeof pebbleLook }> = {
  lifts: { pebble: pebbleLook },
  drop: (_piece, place) => (place === 'bowl' ? { kind: 'drop', place } : undefined),
  tap: () => undefined,
};
