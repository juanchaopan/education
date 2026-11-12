import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { bindObjectDrag } from './object-drag';
import {
  activationAt,
  placeAt,
  type Activation,
  type Handling,
  type Nudge,
  type StageGhost,
} from './stage-activation';

// A prop the child pushes along the stage instead of carrying it, such as a
// car on its track: the move a drag makes, from how far the prop has been
// dragged to the right since the child took hold of it, in world units, and
// the film's state at that moment; and the move one press of an arrow key
// makes. A push without a move does nothing.
export type Slide<Move, State> = Readonly<{
  drag: (by: number, held: State) => Move | undefined;
  nudge: (nudge: Nudge) => Move | undefined;
}>;

// A problem's props: the kinds the child can pick up, each with how it looks
// while carried; the move that putting one on a place makes; the move that
// tapping a prop makes; and the kinds the child pushes along the stage. A
// place or a prop without a move does nothing.
export type StageProps<
  Move,
  Lifts extends Readonly<Record<string, object>>,
  State = unknown,
> = Readonly<{
  lifts: Lifts;
  drop: (piece: keyof Lifts & string, place: string) => Move | undefined;
  tap: (part: string) => Move | undefined;
  slides?: Readonly<Record<string, Slide<Move, State>>>;
}>;

// What the drag needs from the playing film: the state on screen, with its
// scene, and a way to make a move in it.
export type StageFilm<Move, State = unknown> = {
  state: State & { shot: string };
  act: (move: Move) => void;
};

type Held<Piece> = { shot: string; key: string; piece: Piece };
type Drag<Look> = { key: string; ghost?: StageGhost<Look>; over?: string };

// A prop the child has taken hold of: what moving the finger does, and what
// letting go over a place does.
type Grip = {
  move: (event: PointerEvent) => void;
  drop?: (event: PointerEvent) => void;
};

// What taking hold of a prop can do: draw the drag, make a move, and put a
// carried prop on a place.
type Hands<Move, Piece, Look> = {
  show: (drag: Drag<Look>) => void;
  act: (move: Move | undefined) => void;
  put: (piece: Piece, place: string) => void;
};

function toWorld(surface: SVGSVGElement, { clientX, clientY }: PointerEvent) {
  const matrix = surface.getScreenCTM()?.inverse();
  const point = new DOMPoint(clientX, clientY);
  return matrix ? point.matrixTransform(matrix) : point;
}

const placeUnder = ({ clientX, clientY }: PointerEvent) => placeAt(clientX, clientY);

// Whether a part is one of the kinds a record names.
const owns = <Kind extends string>(
  record: Readonly<Record<Kind, unknown>> | undefined,
  part: string | undefined,
): part is Kind => part !== undefined && record !== undefined && Object.hasOwn(record, part);

// How a part is pushed along the stage, if it slides.
const slideOf = <Move, State>(
  slides: Readonly<Record<string, Slide<Move, State>>> | undefined,
  part: string | undefined,
) => (owns(slides, part) ? slides?.[part] : undefined);

// Taking hold of a prop: one that slides is pushed from the state it was
// taken in; one that lifts is carried, drawn as it looks, and put where it is
// let go. Anything else cannot be taken.
function grip<Move, Piece extends string, Look extends object, State>(
  surface: SVGSVGElement,
  start: PointerEvent,
  stage: StageProps<Move, Readonly<Record<Piece, Look>>, State>,
  state: State,
  hands: Hands<Move, Piece, Look>,
): Grip | undefined {
  const { part, key } = activationAt(start.target) ?? {};
  if (!key) return;
  const slide = slideOf(stage.slides, part);
  if (slide) {
    const from = toWorld(surface, start).x;
    return {
      move(moved) {
        hands.show({ key });
        hands.act(slide.drag(toWorld(surface, moved).x - from, state));
      },
    };
  }
  if (!owns(stage.lifts, part)) return;
  const look = stage.lifts[part];
  return {
    move(moved) {
      const { x, y } = toWorld(surface, moved);
      hands.show({ key, ghost: { ...look, x, y }, over: placeUnder(moved) });
    },
    drop(released) {
      const place = placeUnder(released);
      if (place) hands.put(part, place);
    },
  };
}

// Putting a prop on a place, by dragging it there or by tapping it and then
// the place; pushing a prop that slides, by dragging it or with the arrow
// keys; tapping any other prop acts on it directly. The stage is the SVG
// behind `world`. A choice made in an earlier scene no longer counts.
export function useStageDrag<Move, Piece extends string, Look extends object, State = unknown>(
  film: StageFilm<Move, State>,
  stage: StageProps<Move, Readonly<Record<Piece, Look>>, State>,
) {
  const world = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag<Look>>();
  const [held, setHeld] = useState<Held<Piece>>();
  const selected = held?.shot === film.state.shot ? held : undefined;
  const hands: Hands<Move, Piece, Look> = {
    show: setDrag,
    act(move) {
      if (move !== undefined) film.act(move);
    },
    put(piece, place) {
      const move = stage.drop(piece, place);
      if (move === undefined) return;
      setHeld(undefined);
      film.act(move);
    },
  };
  const take = useEffectEvent((surface: SVGSVGElement, start: PointerEvent) =>
    grip(surface, start, stage, film.state, hands),
  );

  useEffect(() => {
    const surface = world.current;
    if (!surface) return;
    return bindObjectDrag(surface, (event) => {
      const taken = take(surface, event);
      if (!taken) return;
      return {
        move: taken.move,
        drop(released) {
          setDrag(undefined);
          taken.drop?.(released);
        },
        cancel: () => setDrag(undefined),
      };
    });
  }, []);

  // A tapped prop acts, or is chosen, or let go again; a tapped place takes
  // the prop chosen.
  function tap({ part, key, place }: Activation) {
    const tapped = part === undefined ? undefined : stage.tap(part);
    if (tapped !== undefined) film.act(tapped);
    else if (owns(stage.lifts, part) && key)
      setHeld(selected?.key === key ? undefined : { shot: film.state.shot, key, piece: part });
    else if (place && selected) hands.put(selected.piece, place);
  }

  return {
    world,
    handling: { selected: selected?.key, lifted: drag?.key, over: drag?.over } as Handling,
    ghost: drag?.ghost,
    activate(activation: Activation) {
      const { part, nudge } = activation;
      if (nudge === undefined) tap(activation);
      else hands.act(slideOf(stage.slides, part)?.nudge(nudge));
    },
  };
}
