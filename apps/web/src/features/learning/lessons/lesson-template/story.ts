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

export const pebbles = 2;

// The title card: the film starts with both pebbles on the table.
export const opening: TemplateState = { shot: 'opening', inBowl: 0 };

// A scene as it first appears, which is also where a saved lesson resumes.
export function arrive(shot: Shot): Reaction {
  const inBowl = shot === 'look' ? 0 : pebbles;
  return { state: { shot, inBowl }, say: entryLines[shot], chime: [] };
}

// Each pebble put in the bowl rings; the last one moves on to the count.
export function respond(state: TemplateState, move: Move): Reaction | undefined {
  if (state.shot !== 'look' || move.place !== 'bowl') return;
  const inBowl = state.inBowl + 1;
  if (inBowl < pebbles) return { state: { ...state, inBowl }, say: [], chime: [440] };
  return { ...arrive('count'), chime: [440, 554] };
}

// The scenes up to the count are work worth saving.
export const savesProgress = (shot: Shot) => shot !== 'after';

// What the child picks up, how big it is while carried, and the move a drop
// on the bowl makes. Nothing in this lesson is only tapped.
export const pebbleLook = { size: 56 };

export const templateProps: StageProps<Move, { pebble: typeof pebbleLook }> = {
  lifts: { pebble: pebbleLook },
  drop: (_piece, place) => (place === 'bowl' ? { kind: 'drop', place } : undefined),
  tap: () => undefined,
};
