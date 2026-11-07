export const TUTORING_MODEL = 'gpt-6-luna';
export const MAX_TUTORING_OUTPUT_TOKENS = 128;
export const MAX_FEEDBACK_OUTPUT_TOKENS = 256;
const MAX_INPUT_TOKENS = 16_384;
// A byte per token plus room for the provider's message framing.
export const MAX_TUTORING_BODY_BYTES = MAX_INPUT_TOKENS - 512;

export type Usage = { inputTokens: number; outputTokens: number };
// A charge is either the reported token usage or, for a provider that does not
// bill by token, an amount in USD nanodollars; never both.
type Charge = { usage: Usage; amount?: never } | { amount: bigint; usage?: never };
export type BillingResult =
  | { status: 'released' | 'unknown' }
  | ({ status: 'settled' } & Charge)
  | ({ status: 'out-of-bounds' } & Partial<Charge>);

// USD nanodollars, using the standard 30-minute cache-write rate for all input.
export function usageCost({ inputTokens, outputTokens }: Usage) {
  return BigInt(inputTokens) * 125n + BigInt(outputTokens) * 500n;
}

// What the ledger records for a result: the token counts when the provider
// reported them, and the amount they or the provider's own measure cost.
export function ledgerCharge(result: BillingResult) {
  const usage = 'usage' in result ? result.usage : undefined;
  const amount = 'amount' in result ? result.amount : undefined;
  return {
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    amount: usage ? usageCost(usage) : amount,
  };
}

// A request is held at the cost of its largest allowed input and output until it settles.
export function reservationCostFor(maxOutputTokens: number) {
  return usageCost({ inputTokens: MAX_INPUT_TOKENS, outputTokens: maxOutputTokens });
}

export const reservationCost = reservationCostFor(MAX_TUTORING_OUTPUT_TOKENS);

export function withinTutoringBounds(
  { inputTokens, outputTokens }: Usage,
  maxOutputTokens: number,
) {
  return inputTokens <= MAX_INPUT_TOKENS && outputTokens <= maxOutputTokens;
}
