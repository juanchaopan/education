import { describe, expect, it } from 'vitest';
import { inside } from './stage-look';

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
