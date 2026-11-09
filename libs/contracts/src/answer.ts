import { Type, type Static } from '@sinclair/typebox';
import { identifierPattern } from './patterns.js';

const closed = { additionalProperties: false };
const uuid = Type.String({
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
});
const scalar = Type.Union([Type.String({ maxLength: 2000 }), Type.Number(), Type.Boolean()]);
const value = Type.Union([scalar, Type.Array(scalar, { maxItems: 32 })]);
const input = Type.Union([
  value,
  Type.Record(Type.String({ pattern: identifierPattern.source }), value, {
    ...closed,
    maxProperties: 32,
  }),
]);
const outcome = Type.Union([
  Type.Literal('independent'),
  Type.Literal('assisted'),
  Type.Literal('incorrect'),
  Type.Literal('uncertain'),
]);

export const answerBodyLimit = 32 * 1024;
export const AnswerRound = Type.Object({ round: uuid }, closed);
export const SubmitAnswer = Type.Object(
  {
    action: Type.Literal('submit'),
    round: uuid,
    attemptId: uuid,
    input,
    draftRevision: Type.Union([uuid, Type.Null()]),
  },
  closed,
);
export const AskForHint = Type.Object(
  {
    action: Type.Literal('hint'),
    round: uuid,
    hintId: Type.String({ pattern: identifierPattern.source }),
  },
  closed,
);
// Sent before a question the child asks the teacher while answering.
export const AskTeacher = Type.Object({ action: Type.Literal('question'), round: uuid }, closed);
export const AnswerCommand = Type.Union([SubmitAnswer, AskForHint, AskTeacher]);
export const AttemptReceipt = Type.Object({ attemptId: uuid, outcome }, closed);
export const HintReceipt = Type.Object(
  { hint: Type.String({ minLength: 1, maxLength: 2000 }) },
  closed,
);
export const QuestionReceipt = Type.Object({ helped: Type.Literal(true) }, closed);
export type AnswerRound = Static<typeof AnswerRound>;
export type SubmitAnswer = Static<typeof SubmitAnswer>;
export type AskForHint = Static<typeof AskForHint>;
export type AnswerCommand = Static<typeof AnswerCommand>;
export type AttemptReceipt = Static<typeof AttemptReceipt>;
