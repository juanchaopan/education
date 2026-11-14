import { Type, type Static } from '@sinclair/typebox';
import { AnswerInput, AnswerOutcome, HintId, HintReceipt } from './answer.js';
import { VariationReason } from './variation.js';

const closed = { additionalProperties: false };
const variation = Type.Literal('variation');

// A parent previewing a problem answers and asks for hints with no round and
// no attempt: the final answer and its hints, and the variation's guessed
// number, a reason said or tapped and the variation's own hints. Nothing is
// kept, so no help is counted and a right answer or a clear reason is
// independent.
export const PreviewCommand = Type.Union([
  Type.Object({ action: Type.Literal('submit'), input: AnswerInput }, closed),
  Type.Object({ action: Type.Literal('hint'), hintId: HintId }, closed),
  Type.Object({ action: variation, guess: AnswerInput }, closed),
  Type.Object({ action: variation, reason: VariationReason }, closed),
  Type.Object({ action: variation, hintId: HintId }, closed),
]);
export const PreviewOutcome = Type.Object(
  { outcome: Type.Exclude(AnswerOutcome, Type.Literal('assisted')) },
  closed,
);
export const PreviewReceipt = Type.Union([PreviewOutcome, HintReceipt]);

export type PreviewCommand = Static<typeof PreviewCommand>;
export type PreviewOutcome = Static<typeof PreviewOutcome>;
export type PreviewReceipt = Static<typeof PreviewReceipt>;
