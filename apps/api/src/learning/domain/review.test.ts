import { describe, expect, it } from 'vitest';
import { problemTotals, reviewSuggested } from './review.js';

const suggested = (versions: { id: string; incorrect: number; independent: number }[]) =>
  [...problemTotals(versions)].filter(([, total]) => reviewSuggested(total)).map(([id]) => id);

describe('reviewSuggested', () => {
  it('suggests a problem answered wrongly twice and never finished alone', () => {
    expect(reviewSuggested({ incorrect: 2, independent: 0 })).toBe(true);
  });

  it('does not suggest a problem answered wrongly only once', () => {
    expect(reviewSuggested({ incorrect: 1, independent: 0 })).toBe(false);
  });

  it('does not suggest a problem the child has finished alone', () => {
    expect(reviewSuggested({ incorrect: 3, independent: 1 })).toBe(false);
  });
});

describe('a problem across its versions', () => {
  it('is not suggested once the child finished a newer version alone', () => {
    expect(
      suggested([
        { id: 'apples', incorrect: 2, independent: 0 },
        { id: 'apples', incorrect: 0, independent: 1 },
      ]),
    ).toEqual([]);
  });

  it('stays suggested while the newer version is not tried yet', () => {
    expect(suggested([{ id: 'apples', incorrect: 2, independent: 0 }])).toEqual(['apples']);
  });

  it('adds up wrong answers on different versions', () => {
    expect(
      suggested([
        { id: 'apples', incorrect: 1, independent: 0 },
        { id: 'apples', incorrect: 1, independent: 0 },
        { id: 'pears', incorrect: 1, independent: 0 },
      ]),
    ).toEqual(['apples']);
  });
});
