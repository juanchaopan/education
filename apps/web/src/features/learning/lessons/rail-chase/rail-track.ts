import type { Shot } from './script';

// The tracks on the stage's 1200×675 world. One square of the problem is
// `unit` world units long, and a point the problem puts at n squares stands
// at `xAt(n)`; the tracks run from the square left of the yellow car's
// start to the right edge of the backdrop's clearing.
export const unit = 28;
export const xAt = (squares: number) => 150 + (squares + 2) * unit;
export const trackEnd = 1000;

// The heights the scene's rows run at: the middle of the question, the two
// tracks the cars' wheels run on, the squares between the two midpoints and
// the start strip.
export const rows = { question: 284, yellow: 418, blue: 470, gap: 488, start: 522 } as const;

export type Car = 'yellow' | 'blue';

// How high each car's roof stands above its track, and its midpoint, in
// world units, as the cars are drawn.
export const carHeights: Readonly<Record<Car, { roof: number; middle: number }>> = {
  yellow: { roof: 40, middle: 19 },
  blue: { roof: 40, middle: 21 },
};

// Where each car's midpoint starts, how long each car is, in squares.
export const starts: Readonly<Record<Car, number>> = { yellow: -1, blue: 9 };
export const lengths: Readonly<Record<Car, number>> = { yellow: 2, blue: 6 };

// The variation makes the yellow car faster; the blue car keeps its speed.
const varied: readonly Shot[] = ['vary', 'vary-seven'];

// How many squares a car drives in a second in a scene.
export function speedOf(car: Car, shot: Shot | 'opening'): number {
  if (car === 'blue') return 1;
  return varied.includes(shot as Shot) ? 3 : 2;
}

// Where both midpoints stand, in squares, once the cars have driven `t`
// seconds in a scene, and the gap from M to N: positive while the blue car
// is ahead, negative once the yellow car has passed it.
export function positions(t: number, shot: Shot | 'opening') {
  const m = starts.yellow + speedOf('yellow', shot) * t;
  const n = starts.blue + speedOf('blue', shot) * t;
  return { m, n, gap: n - m };
}

// The squares of the start strip won back after `t` seconds: as many as the
// yellow car gains a second, every second, until all ten are won.
export function wonBack(t: number, shot: Shot | 'opening') {
  const start = starts.blue - starts.yellow;
  const gain = speedOf('yellow', shot) - speedOf('blue', shot);
  return Math.min(start, Math.floor(gain * t + 1e-9));
}
