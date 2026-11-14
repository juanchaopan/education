import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStageDrag, type StageFilm, type StageProps } from './useStageDrag';

type Move =
  { plant: 'seed'; place: 'pot' } | 'ring' | { roll: number; from: number } | { step: 1 | -1 };
type Look = { size: number };
// The film's state: a cart rolled some way along its rail.
type State = { shot: string; rolled: number };

const stage: StageProps<Move, { seed: Look }, State> = {
  lifts: { seed: { size: 30 } },
  drop: (piece, place) => (place === 'pot' ? { plant: piece, place } : undefined),
  tap: (part) => (part === 'bell' ? 'ring' : undefined),
  slides: {
    cart: {
      drag: (by, held) => (by < 0 ? undefined : { roll: by, from: held.rolled }),
      nudge: (step) => ({ step }),
    },
  },
};

type Drag = Omit<ReturnType<typeof useStageDrag<Move, 'seed', Look, State>>, 'world'>;
type Film = StageFilm<Move, State>;

function Stage({ film, seen }: { film: Film; seen: (drag: Drag) => void }) {
  const { world, ...drag } = useStageDrag(film, stage);
  useEffect(() => {
    seen(drag);
  });
  return (
    <svg ref={world}>
      <g data-part="seed" data-key="seed-0" />
      <g data-part="bell" data-key="bell" />
      <g data-part="cart" data-key="cart" />
      <g data-place="pot" />
      <g data-place="pond" />
    </svg>
  );
}

// Each x coordinate stands over one element of the stage.
const spots = { seed: 10, pot: 200, pond: 300, nowhere: 400 } as const;

function setup() {
  const acted = vi.fn<(move: Move) => void>();
  let latest!: Drag;
  const seen = (drag: Drag) => {
    latest = drag;
  };
  const film = (shot: string, rolled = 0): Film => ({ state: { shot, rolled }, act: acted });
  const view = render(<Stage film={film('plant')} seen={seen} />);
  const svg = view.container.querySelector('svg')!;
  const at = (name: string) =>
    view.container.querySelector(`[data-part="${name}"], [data-place="${name}"]`)!;
  for (const part of [at('seed'), at('cart')])
    Object.assign(part, { setPointerCapture: () => {}, hasPointerCapture: () => false });
  Object.assign(svg, { getScreenCTM: () => null });
  document.elementFromPoint = (x: number) => {
    const name = Object.entries(spots).find(([, spot]) => spot === x)?.[0];
    return name && name !== 'nowhere' ? at(name) : svg;
  };
  const pointerOn = (name: string) => (type: string, clientX: number) =>
    act(() => {
      at(name).dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          clientX,
          clientY: 5,
          isPrimary: true,
          bubbles: true,
        }),
      );
    });
  const show = (shot: string, rolled?: number) =>
    view.rerender(<Stage film={film(shot, rolled)} seen={seen} />);
  return {
    acted,
    drag: () => latest,
    pointer: pointerOn('seed'),
    cart: pointerOn('cart'),
    show,
  };
}

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

beforeEach(() => vi.stubGlobal('DOMPoint', Point));
afterEach(() => vi.unstubAllGlobals());

it('carries a prop under the finger and puts it on the place it is dropped on', () => {
  const { acted, drag, pointer } = setup();
  pointer('pointerdown', spots.seed);
  pointer('pointermove', spots.pot);
  expect(drag().handling).toEqual({ lifted: 'seed-0', over: 'pot' });
  expect(drag().ghost).toEqual({ size: 30, x: spots.pot, y: 5 });
  pointer('pointerup', spots.pot);
  expect(acted).toHaveBeenCalledExactlyOnceWith({ plant: 'seed', place: 'pot' });
  expect(drag().ghost).toBeUndefined();
});

it('puts the prop back when it is dropped anywhere that takes nothing', () => {
  const { acted, drag, pointer } = setup();
  pointer('pointerdown', spots.seed);
  pointer('pointermove', spots.pond);
  pointer('pointerup', spots.pond);
  pointer('pointerdown', spots.seed);
  pointer('pointermove', spots.nowhere);
  pointer('pointerup', spots.nowhere);
  expect(acted).not.toHaveBeenCalled();
  expect(drag().handling).toEqual({});
  expect(drag().ghost).toBeUndefined();
});

it('puts a tapped prop on the place tapped next', () => {
  const { acted, drag } = setup();
  act(() => drag().activate({ place: 'pot' }));
  expect(acted).not.toHaveBeenCalled();
  act(() => drag().activate({ part: 'seed', key: 'seed-0' }));
  expect(drag().handling.selected).toBe('seed-0');
  act(() => drag().activate({ place: 'pond' }));
  expect(drag().handling.selected).toBe('seed-0');
  act(() => drag().activate({ place: 'pot' }));
  expect(acted).toHaveBeenCalledExactlyOnceWith({ plant: 'seed', place: 'pot' });
  expect(drag().handling.selected).toBeUndefined();
});

it('lets go of a chosen prop when it is tapped again', () => {
  const { acted, drag } = setup();
  act(() => drag().activate({ part: 'seed', key: 'seed-0' }));
  act(() => drag().activate({ part: 'seed', key: 'seed-0' }));
  expect(drag().handling.selected).toBeUndefined();
  act(() => drag().activate({ place: 'pot' }));
  expect(acted).not.toHaveBeenCalled();
});

it('acts on a prop that is tapped rather than carried', () => {
  const { acted, drag } = setup();
  act(() => drag().activate({ part: 'bell', key: 'bell' }));
  expect(acted).toHaveBeenCalledExactlyOnceWith('ring');
  act(() => drag().activate({ part: 'leaf', key: 'leaf' }));
  expect(acted).toHaveBeenCalledOnce();
});

it('forgets a prop chosen in an earlier scene', () => {
  const { acted, drag, show } = setup();
  act(() => drag().activate({ part: 'seed', key: 'seed-0' }));
  show('water');
  expect(drag().handling.selected).toBeUndefined();
  act(() => drag().activate({ place: 'pot' }));
  expect(acted).not.toHaveBeenCalled();
});

it('pushes a sliding prop by how far it is dragged from where it was taken', () => {
  const { acted, drag, cart, show } = setup();
  show('plant', 3);
  cart('pointerdown', 100);
  cart('pointermove', 130);
  expect(drag().handling).toEqual({ lifted: 'cart' });
  expect(drag().ghost).toBeUndefined();
  // The film has moved on under the finger; the push still counts from
  // where the cart was taken.
  show('plant', 4);
  cart('pointermove', 160);
  cart('pointerup', 160);
  expect(acted.mock.calls).toEqual([[{ roll: 30, from: 3 }], [{ roll: 60, from: 3 }]]);
  expect(drag().handling).toEqual({});
});

it('makes no move for a push the sliding prop does not take', () => {
  const { acted, drag, cart } = setup();
  cart('pointerdown', 100);
  cart('pointermove', 60);
  cart('pointercancel', 60);
  expect(acted).not.toHaveBeenCalled();
  expect(drag().handling).toEqual({});
});

it('nudges a sliding prop with the arrow keys, and nothing else', () => {
  const { acted, drag } = setup();
  act(() => drag().activate({ part: 'cart', key: 'cart', nudge: 1 }));
  act(() => drag().activate({ part: 'cart', key: 'cart', nudge: -1 }));
  act(() => drag().activate({ part: 'bell', key: 'bell', nudge: 1 }));
  act(() => drag().activate({ part: 'seed', key: 'seed-0', nudge: 1 }));
  expect(acted.mock.calls).toEqual([[{ step: 1 }], [{ step: -1 }]]);
  expect(drag().handling.selected).toBeUndefined();
});
