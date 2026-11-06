import { expect, it } from 'vitest';
import { reservationCost, usageCost, withinTutoringBounds } from './tutoring-cost.js';

it('reserves for the full bounded text request at standard rates including cache writes', () => {
  expect(reservationCost).toBe(2_112_000n);
  expect(usageCost({ inputTokens: 82, outputTokens: 12 })).toBe(16_250n);
});

it('detects supplier usage outside the bounds even when the estimated cost fits', () => {
  expect(withinTutoringBounds({ inputTokens: 0, outputTokens: 129 })).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_385, outputTokens: 0 })).toBe(false);
  expect(withinTutoringBounds({ inputTokens: 16_384, outputTokens: 128 })).toBe(true);
});
