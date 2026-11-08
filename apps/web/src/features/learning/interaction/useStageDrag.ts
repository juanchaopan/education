import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { bindObjectDrag } from './object-drag';

// What the child is holding: a prop picked up for a drag or chosen by tapping,
// and the place the drag is over.
export type Handling = Readonly<{ selected?: string; lifted?: string; over?: string }>;

// What the child tapped on the stage: a prop, by its kind and its own key, or a
// place props can be put.
export type Activation = Readonly<{ part?: string; key?: string; place?: string }>;

// A prop carried under the child's finger, drawn as it looks on the stage, at
// the stage coordinates of the pointer.
export type StageGhost<Look> = Look & Readonly<{ x: number; y: number }>;

// A problem's props: the kinds the child can pick up and how each looks while
// carried, the move that putting one on a place makes, and the move that
// tapping a prop makes. A place or a prop without a move does nothing.
export type StageProps<Move, Piece extends string, Look> = Readonly<{
  lifts: Readonly<Record<Piece, Look>>;
  drop: (piece: Piece, place: string) => Move | undefined;
  tap: (part: string) => Move | undefined;
}>;

type Film<Move> = { state: { shot: string }; act: (move: Move) => void };
type Held<Piece> = { shot: string; key: string; piece: Piece };
type Drag<Look> = { key: string; ghost: StageGhost<Look>; over?: string };

function placeAt({ clientX, clientY }: PointerEvent) {
  return document.elementFromPoint(clientX, clientY)?.closest<SVGElement>('[data-place]')?.dataset
    .place;
}

function toWorld(surface: SVGSVGElement, { clientX, clientY }: PointerEvent) {
  const matrix = surface.getScreenCTM()?.inverse();
  const point = new DOMPoint(clientX, clientY);
  return matrix ? point.matrixTransform(matrix) : point;
}

function pieceAt(target: EventTarget | null) {
  const node = target instanceof Element ? target.closest<SVGElement>('[data-part]') : null;
  return { part: node?.dataset.part, key: node?.dataset.key };
}

// Putting a prop on a place, by dragging it there or by tapping it and then
// the place; tapping any other prop acts on it directly. The stage is the SVG
// behind `world`, whose props carry `data-part` and `data-key` and whose places
// carry `data-place`. A choice made in an earlier scene no longer counts.
export function useStageDrag<Move, Piece extends string, Look extends object>(
  film: Film<Move>,
  props: StageProps<Move, Piece, Look>,
) {
  const world = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag<Look>>();
  const [held, setHeld] = useState<Held<Piece>>();
  const selected = held?.shot === film.state.shot ? held : undefined;
  const liftable = (part: string | undefined): part is Piece =>
    part !== undefined && Object.hasOwn(props.lifts, part);

  function put(piece: Piece, place: string) {
    const move = props.drop(piece, place);
    if (!move) return;
    setHeld(undefined);
    film.act(move);
  }
  const dropped = useEffectEvent(put);
  const lift = useEffectEvent((part: string | undefined) =>
    liftable(part) ? { piece: part, look: props.lifts[part] } : undefined,
  );

  useEffect(() => {
    const surface = world.current;
    if (!surface) return;
    return bindObjectDrag(surface, (event) => {
      const { part, key } = pieceAt(event.target);
      const lifted = lift(part);
      if (!lifted || !key) return;
      return {
        move(moved) {
          const { x, y } = toWorld(surface, moved);
          setDrag({ key, ghost: { ...lifted.look, x, y }, over: placeAt(moved) });
        },
        drop(released) {
          setDrag(undefined);
          const place = placeAt(released);
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
      const tapped = part === undefined ? undefined : props.tap(part);
      if (tapped) film.act(tapped);
      else if (liftable(part) && key)
        setHeld(selected?.key === key ? undefined : { shot: film.state.shot, key, piece: part });
      else if (place && selected) put(selected.piece, place);
    },
  };
}
