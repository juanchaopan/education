import { Type, type Static } from '@sinclair/typebox';
import { identifierPattern } from './patterns.js';

const closed = { additionalProperties: false };
export const Uuid = Type.String({
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
});
const scalar = Type.Union([Type.String({ maxLength: 2000 }), Type.Number(), Type.Boolean()]);
const value = Type.Union([scalar, Type.Array(scalar, { maxItems: 32 })]);
// What a child answers: a number, a word, a list, or named parts of these.
export const AnswerInput = Type.Union([
  value,
  Type.Record(Type.String({ pattern: identifierPattern.source }), value, {
    ...closed,
    maxProperties: 32,
  }),
]);
// How an answer is recorded: right without help, right after help, wrong, or
// not understood, which is never counted as wrong.
export const AnswerOutcome = Type.Union([
  Type.Literal('independent'),
  Type.Literal('assisted'),
  Type.Literal('incorrect'),
  Type.Literal('uncertain'),
]);
export const HintId = Type.String({ pattern: identifierPattern.source });

export const answerBodyLimit = 32 * 1024;
export const AnswerRound = Type.Object({ round: Uuid }, closed);
export const SubmitAnswer = Type.Object(
  {
    action: Type.Literal('submit'),
    round: Uuid,
    attemptId: Uuid,
    input: AnswerInput,
    draftRevision: Type.Union([Uuid, Type.Null()]),
  },
  closed,
);
export const AskForHint = Type.Object(
  { action: Type.Literal('hint'), round: Uuid, hintId: HintId },
  closed,
);
// Sent before a question the child asks the teacher while answering.
export const AskTeacher = Type.Object({ action: Type.Literal('question'), round: Uuid }, closed);
export const AnswerCommand = Type.Union([SubmitAnswer, AskForHint, AskTeacher]);
export const AttemptReceipt = Type.Object({ attemptId: Uuid, outcome: AnswerOutcome }, closed);
export const HintReceipt = Type.Object(
  { hint: Type.String({ minLength: 1, maxLength: 2000 }) },
  closed,
);
export const QuestionReceipt = Type.Object({ helped: Type.Literal(true) }, closed);
export type AnswerInput = Static<typeof AnswerInput>;
export type AnswerOutcome = Static<typeof AnswerOutcome>;
export type AnswerRound = Static<typeof AnswerRound>;
export type SubmitAnswer = Static<typeof SubmitAnswer>;
export type AskForHint = Static<typeof AskForHint>;
export type AnswerCommand = Static<typeof AnswerCommand>;
export type AttemptReceipt = Static<typeof AttemptReceipt>;
