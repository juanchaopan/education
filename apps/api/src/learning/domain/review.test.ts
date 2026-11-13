import { describe, expect, it } from 'vitest';
import { reviewSuggested } from './review.js';

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
