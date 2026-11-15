import { describe, expect, it } from 'vitest';
import { amountPlan, arrangement, piled } from './board-layout';

const lines = (count: number, shape: Parameters<typeof arrangement>[1]) =>
  arrangement(count, shape).lines;

describe('how the board piles the copies of one thing', () => {
  it('sets round things side by side, then in two rows with the shorter row on top', () => {
    expect([1, 2, 3, 4, 5, 8].map((count) => lines(count, 'round'))).toEqual([
      [1],
      [2],
      [1, 2],
      [2, 2],
      [2, 3],
      [4, 4],
    ]);
    expect(arrangement(3, 'round').across).toBe(true);
  });

  it('stacks long things in one column, then in two', () => {
    expect([1, 3, 4, 5, 7].map((count) => lines(count, 'long'))).toEqual([
      [1],
      [3],
      [2, 2],
      [3, 2],
      [4, 3],
    ]);
    expect(arrangement(3, 'long').across).toBe(false);
  });

  it('stands tall things side by side, then in two rows with the longer row on top', () => {
    expect([3, 4, 5, 8].map((count) => lines(count, 'tall'))).toEqual([[3], [4], [3, 2], [4, 4]]);
  });

  it('never piles more than two lines high', () => {
    for (const shape of ['round', 'long', 'tall'] as const) {
      for (let count = 1; count <= 8; count += 1) {
        expect(lines(count, shape).length).toBeLessThanOrEqual(2);
        expect(lines(count, shape).reduce((sum, line) => sum + line, 0)).toBe(count);
      }
    }
  });
});

describe('what the board draws of an amount', () => {
  it('draws every thing it counts', () => {
    expect(amountPlan(3, 'round', {})).toEqual({ things: { lines: [1, 2], across: true } });
  });

  it('draws frames side by side, each holding its group', () => {
    expect(amountPlan(9, 'long', { group: 3 })).toEqual({
      frames: { lines: [3], across: true },
      things: { lines: [3], across: false },
    });
  });

  it('writes 「k×」 before one thing, or one frame', () => {
    expect(amountPlan(64, 'round', { times: true })).toEqual({
      times: 64,
      things: { lines: [1], across: true },
    });
    expect(amountPlan(32, 'round', { group: 8, times: true })).toEqual({
      times: 4,
      frames: { lines: [1], across: true },
      things: { lines: [4, 4], across: true },
    });
  });

  it('draws things smaller once they pile up or sit in frames', () => {
    expect(piled(amountPlan(2, 'round', {}))).toBe(false);
    expect(piled(amountPlan(3, 'round', {}))).toBe(true);
    expect(piled(amountPlan(6, 'long', { group: 2 }))).toBe(true);
  });
});
