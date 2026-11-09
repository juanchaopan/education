import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { bindObjectDrag } from './object-drag';
import {
  activationAt,
  placeAt,
  type Activation,
  type Handling,
  type StageGhost,
} from './stage-activation';

// A problem's props: the kinds the child can pick up, each with how it looks
// while carried; the move that putting one on a place makes; and the move that
// tapping a prop makes. A place or a prop without a move does nothing.
export type StageProps<Move, Lifts extends Readonly<Record<string, object>>> = Readonly<{
  lifts: Lifts;
  drop: (piece: keyof Lifts & string, place: string) => Move | undefined;
  tap: (part: string) => Move | undefined;
}>;

// What the drag needs from the playing film: the scene on screen and a way to
// make a move in it.
export type StageFilm<Move> = { state: { shot: string }; act: (move: Move) => void };

type Held<Piece> = { shot: string; key: string; piece: Piece };
type Drag<Look> = { key: string; ghost: StageGhost<Look>; over?: string };

function toWorld(surface: SVGSVGElement, { clientX, clientY }: PointerEvent) {
  const matrix = surface.getScreenCTM()?.inverse();
  const point = new DOMPoint(clientX, clientY);
  return matrix ? point.matrixTransform(matrix) : point;
}

const placeUnder = ({ clientX, clientY }: PointerEvent) => placeAt(clientX, clientY);

// Putting a prop on a place, by dragging it there or by tapping it and then
// the place; tapping any other prop acts on it directly. The stage is the SVG
// behind `world`. A choice made in an earlier scene no longer counts.
export function useStageDrag<Move, Piece extends string, Look extends object>(
  film: StageFilm<Move>,
  stage: StageProps<Move, Readonly<Record<Piece, Look>>>,
) {
  const world = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag<Look>>();
  const [held, setHeld] = useState<Held<Piece>>();
  const selected = held?.shot === film.state.shot ? held : undefined;
  const liftable = (part: string | undefined): part is Piece =>
    part !== undefined && Object.hasOwn(stage.lifts, part);

  function put(piece: Piece, place: string) {
    const move = stage.drop(piece, place);
    if (move === undefined) return;
    setHeld(undefined);
    film.act(move);
  }
  const dropped = useEffectEvent(put);
  const lift = useEffectEvent((part: string | undefined) =>
    liftable(part) ? { piece: part, look: stage.lifts[part] } : undefined,
  );

  useEffect(() => {
    const surface = world.current;
    if (!surface) return;
    return bindObjectDrag(surface, (event) => {
      const { part, key } = activationAt(event.target) ?? {};
      const lifted = lift(part);
      if (!lifted || !key) return;
      return {
        move(moved) {
          const { x, y } = toWorld(surface, moved);
          setDrag({ key, ghost: { ...lifted.look, x, y }, over: placeUnder(moved) });
        },
        drop(released) {
          setDrag(undefined);
          const place = placeUnder(released);
          if (place) dropped(lifted.piece, place);
        },
        cancel: () => setDrag(undefined),
      };
    });
  }, []);

  const handling: Handling = { selected: selected?.key, lifted: drag?.key, over: drag?.over };

  return {
    world,
    handling,
    ghost: drag?.ghost,
    activate({ part, key, place }: Activation) {
      const tapped = part === undefined ? undefined : stage.tap(part);
      if (tapped !== undefined) film.act(tapped);
      else if (liftable(part) && key)
        setHeld(selected?.key === key ? undefined : { shot: film.state.shot, key, piece: part });
      else if (place && selected) put(selected.piece, place);
    },
  };
}
