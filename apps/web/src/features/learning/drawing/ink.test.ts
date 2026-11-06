import { describe, expect, it } from 'vitest';
import { normalizedPoint } from './ink';

describe('drawing coordinates', () => {
  it('preserves position across layout offsets and proportional resize', () => {
    const large = normalizedPoint(
      { left: 10, top: 30, width: 800, height: 600 },
      { clientX: 210, clientY: 330 },
    );
    const small = normalizedPoint(
      { left: 80, top: 10, width: 400, height: 300 },
      { clientX: 180, clientY: 160 },
    );
    expect(large).toEqual({ x: 0.25, y: 0.5 });
    expect(small).toEqual(large);
  });

  it('keeps captured pointers within the sheet and ignores a collapsed surface', () => {
    const bounds = { left: 10, top: 10, width: 400, height: 300 };
    expect(normalizedPoint(bounds, { clientX: -20, clientY: 350 })).toEqual({ x: 0, y: 1 });
    expect(normalizedPoint({ ...bounds, width: 0 }, { clientX: 20, clientY: 50 })).toBeUndefined();
  });
});
