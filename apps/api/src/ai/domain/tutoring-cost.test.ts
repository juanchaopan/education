import { expect, it } from 'vitest';
import {
  MAX_TUTORING_OUTPUT_TOKENS,
  reservationCost,
  usageCost,
  withinTutoringBounds,
} from './tutoring-cost.js';

it('reserves for the full bounded text request at standard rates including cache writes', () => {
  expect(reservationCost).toBe(2_112_000n);
  expect(usageCost({ inputTokens: 82, outputTokens: 12 })).toBe(16_250n);
});

it('detects supplier usage outside the bounds even when the estimated cost fits', () => {
  const max = MAX_TUTORING_OUTPUT_TOKENS;
  expect(withinTutoringBounds({ inputTokens: 0, outputTokens: 129 }, max)).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_385, outputTokens: 0 }, max)).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_384, outputTokens: 128 }, max)).toBe(true);
});
