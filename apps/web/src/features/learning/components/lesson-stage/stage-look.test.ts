import { describe, expect, it } from 'vitest';
import { framed, inside, world } from './stage-look';

describe('boxes in the world', () => {
  const frame = { x: 10, y: 10, width: 100, height: 50 };

  it('lie inside a frame when every edge is within it, touching included', () => {
    expect(inside(frame, frame)).toBe(true);
    expect(inside({ x: 20, y: 20, width: 10, height: 10 }, frame)).toBe(true);
  });

  it('do not when any edge passes beyond it', () => {
    expect(inside({ ...frame, x: 9 }, frame)).toBe(false);
    expect(inside({ ...frame, y: 11 }, frame)).toBe(false);
    expect(inside({ ...frame, width: 101 }, frame)).toBe(false);
    expect(inside({ ...frame, height: 51 }, frame)).toBe(false);
  });
});

describe('a box on the framed backdrop', () => {
  const box = { x: 300, y: 200, width: 600, height: 300 };

  it('stays put without zoom or movement', () => {
    expect(framed(box, { zoom: 1 })).toEqual(box);
  });

  it('grows away from the middle of the world as the backdrop zooms in', () => {
    expect(framed(world, { zoom: 2 })).toEqual({ x: -600, y: -337.5, width: 2400, height: 1350 });
    expect(framed(box, { zoom: 2 })).toEqual({ x: 0, y: 62.5, width: 1200, height: 600 });
  });

  it('moves by a share of the world before the zoom', () => {
    expect(framed(box, { zoom: 1, x: 10, y: -20 })).toEqual({
      x: 420,
      y: 65,
      width: 600,
      height: 300,
    });
    expect(framed(box, { zoom: 2, x: 10 })).toEqual({ x: 240, y: 62.5, width: 1200, height: 600 });
  });
});
