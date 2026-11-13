import { Type, type Static } from '@sinclair/typebox';
import { AnswerInput, AnswerOutcome, HintId, HintReceipt } from './answer.js';

const closed = { additionalProperties: false };

// A parent previewing a problem answers and asks for hints with no round and
// no attempt: nothing is kept, so no help is counted and a right answer is
// independent.
export const PreviewCommand = Type.Union([
  Type.Object({ action: Type.Literal('submit'), input: AnswerInput }, closed),
  Type.Object({ action: Type.Literal('hint'), hintId: HintId }, closed),
]);
export const PreviewOutcome = Type.Object(
  { outcome: Type.Exclude(AnswerOutcome, Type.Literal('assisted')) },
  closed,
);
export const PreviewReceipt = Type.Union([PreviewOutcome, HintReceipt]);

export type PreviewCommand = Static<typeof PreviewCommand>;
export type PreviewOutcome = Static<typeof PreviewOutcome>;
export type PreviewReceipt = Static<typeof PreviewReceipt>;
