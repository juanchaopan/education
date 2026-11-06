export const TUTORING_MODEL = 'gpt-6-luna';
export const MAX_TUTORING_OUTPUT_TOKENS = 128;
const MAX_INPUT_TOKENS = 16_384;
// A byte per token plus room for the provider's message framing.
export const MAX_TUTORING_BODY_BYTES = MAX_INPUT_TOKENS - 512;

export type Usage = { inputTokens: number; outputTokens: number };
export type BillingResult =
  | { status: 'released' | 'unknown' }
  | { status: 'settled'; usage: Usage }
  | { status: 'out-of-bounds'; usage?: Usage };

// USD nanodollars, using the standard 30-minute cache-write rate for all input.
export function usageCost({ inputTokens, outputTokens }: Usage) {
  return BigInt(inputTokens) * 125n + BigInt(outputTokens) * 500n;
}

export const reservationCost = usageCost({
  inputTokens: MAX_INPUT_TOKENS,
  outputTokens: MAX_TUTORING_OUTPUT_TOKENS,
});

export function withinTutoringBounds({ inputTokens, outputTokens }: Usage) {
  return inputTokens <= MAX_INPUT_TOKENS && outputTokens <= MAX_TUTORING_OUTPUT_TOKENS;
}
