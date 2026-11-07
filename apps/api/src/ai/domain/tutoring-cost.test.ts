import { expect, it } from 'vitest';
import {
  MAX_FEEDBACK_OUTPUT_TOKENS,
  MAX_TUTORING_OUTPUT_TOKENS,
  largestReservationCost,
  reservationCost,
  reservationCostFor,
  usageCost,
  withinTutoringBounds,
} from './tutoring-cost.js';

it('reserves for the full bounded text request at standard rates including cache writes', () => {
  expect(reservationCost).toBe(2_112_000n);
  expect(usageCost({ inputTokens: 82, outputTokens: 12 })).toBe(16_250n);
});

it('reserves more for tasks that may produce longer output', () => {
  expect(reservationCostFor(MAX_FEEDBACK_OUTPUT_TOKENS)).toBe(2_176_000n);
  expect(largestReservationCost).toBe(2_176_000n);
});

it('detects supplier usage outside the bounds even when the estimated cost fits', () => {
  const max = MAX_TUTORING_OUTPUT_TOKENS;
  expect(withinTutoringBounds({ inputTokens: 0, outputTokens: 129 }, max)).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_385, outputTokens: 0 }, max)).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_384, outputTokens: 128 }, max)).toBe(true);
  expect(withinTutoringBounds({ inputTokens: 0, outputTokens: 129 }, 256)).toBe(true);
});
