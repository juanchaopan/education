import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStageDrag, type StageProps } from './useStageDrag';

type Move = { plant: 'seed'; place: 'pot' } | 'ring';

const props: StageProps<Move, 'seed', { size: number }> = {
  lifts: { seed: { size: 30 } },
  drop: (piece, place) => (place === 'pot' ? { plant: piece, place } : undefined),
  tap: (part) => (part === 'bell' ? 'ring' : undefined),
};

type Drag = Omit<ReturnType<typeof useStageDrag<Move, 'seed', { size: number }>>, 'world'>;
type Film = { state: { shot: string }; act: (move: Move) => void };

function Stage({ film, seen }: { film: Film; seen: (drag: Drag) => void }) {
  const { world, ...drag } = useStageDrag(film, props);
  useEffect(() => {
    seen(drag);
  });
  return (
    <svg ref={world}>
      <g data-part="seed" data-key="seed-0" />
      <g data-part="bell" data-key="bell" />
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
  const view = render(<Stage film={{ state: { shot: 'plant' }, act: acted }} seen={seen} />);
  const svg = view.container.querySelector('svg')!;
  const at = (name: string) =>
    view.container.querySelector(`[data-part="${name}"], [data-place="${name}"]`)!;
  const seed = at('seed');
  Object.assign(seed, { setPointerCapture: () => {}, hasPointerCapture: () => false });
  Object.assign(svg, { getScreenCTM: () => null });
  document.elementFromPoint = (x: number) => {
    const name = Object.entries(spots).find(([, spot]) => spot === x)?.[0];
    return name && name !== 'nowhere' ? at(name) : svg;
  };
  const pointer = (type: string, clientX: number) =>
    act(() => {
      seed.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          clientX,
          clientY: 5,
          isPrimary: true,
          bubbles: true,
        }),
      );
    });
  const shot = (name: string) =>
    view.rerender(<Stage film={{ state: { shot: name }, act: acted }} seen={seen} />);
  return { acted, drag: () => latest, pointer, shot };
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
  const { acted, drag, shot } = setup();
  act(() => drag().activate({ part: 'seed', key: 'seed-0' }));
  shot('water');
  expect(drag().handling.selected).toBeUndefined();
  act(() => drag().activate({ place: 'pot' }));
  expect(acted).not.toHaveBeenCalled();
});
