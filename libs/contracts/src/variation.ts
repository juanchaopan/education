import { Type, type Static } from '@sinclair/typebox';
import { AnswerInput, AnswerOutcome, HintId, Uuid } from './answer.js';
import { ProblemId, ProblemSummary, ProblemVersion } from './catalog.js';
import { identifierPattern } from './patterns.js';
import { ChildText } from './teaching-feedback.js';

const closed = { additionalProperties: false };
const Count = Type.Integer({ minimum: 0 });
const Choices = Type.Array(Type.String({ pattern: identifierPattern.source }), {
  maxItems: 8,
  uniqueItems: true,
});

// The variation of the latest round the child answered right, which every
// variation request names: whether its guess and a clear reason are recorded.
// `round` is null before the child has answered the problem right.
export const VariationState = Type.Object(
  { round: Type.Union([Uuid, Type.Null()]), guessed: Type.Boolean(), explained: Type.Boolean() },
  closed,
);

// Why the child thinks the result came out as it did: one spoken sentence, or
// the authored choices tapped as kept and as changed. Both are judged by the
// same authored rule, and the server keeps neither, only the result.
export const VariationReason = Type.Union([
  Type.Object({ say: ChildText }, closed),
  Type.Object({ choose: Type.Object({ kept: Choices, changed: Choices }, closed) }, closed),
]);

export const SubmitGuess = Type.Object(
  { action: Type.Literal('guess'), round: Uuid, attemptId: Uuid, input: AnswerInput },
  closed,
);
export const SubmitReason = Type.Object(
  { action: Type.Literal('reason'), round: Uuid, attemptId: Uuid, reason: VariationReason },
  closed,
);
export const AskVariationHint = Type.Object(
  { action: Type.Literal('hint'), round: Uuid, hintId: HintId },
  closed,
);
// Sent before a question the child asks the teacher during the variation.
export const AskDuringVariation = Type.Object(
  { action: Type.Literal('question'), round: Uuid },
  closed,
);
export const VariationCommand = Type.Union([
  SubmitGuess,
  SubmitReason,
  AskVariationHint,
  AskDuringVariation,
]);

// A judged guess or reason. For a reason, independent and assisted are 说清了
// without and after help, incorrect is 没说清, and uncertain means it could
// not be judged and nothing was recorded; the same holds for a guess.
export const VariationReceipt = Type.Object({ attemptId: Uuid, outcome: AnswerOutcome }, closed);

// One variation the child did: the guess (null when the child left before
// guessing), the first judged reason and the final result of the reason, the
// help taken, and when it started and was last answered.
export const VariationAttempt = Type.Object(
  {
    guess: Type.Union([
      Type.Literal('independent'),
      Type.Literal('assisted'),
      Type.Literal('incorrect'),
      Type.Null(),
    ]),
    reason: Type.Object(
      {
        first: Type.Union([Type.Literal('clear'), Type.Literal('unclear'), Type.Null()]),
        final: Type.Union([
          Type.Literal('independent'),
          Type.Literal('assisted'),
          Type.Literal('unclear'),
        ]),
      },
      closed,
    ),
    help: Count,
    startedAt: Type.String(),
    updatedAt: Type.String(),
  },
  closed,
);

export const VariationPart = Type.Union([Type.Literal('guess'), Type.Literal('reason')]);
// The best a part has been done in any variation of the problem.
export const VariationPartStatus = Type.Union([
  Type.Literal('independent'),
  Type.Literal('assisted'),
  Type.Literal('not-yet'),
]);

// A problem's variations: what the records show the child has done, the parts
// not yet done without help, and every variation, oldest first.
export const ProblemVariations = Type.Object(
  {
    id: ProblemId,
    version: ProblemVersion,
    title: Type.Union([ProblemSummary.properties.title, Type.Null()]),
    status: Type.Object({ guess: VariationPartStatus, reason: VariationPartStatus }, closed),
    missing: Type.Array(VariationPart),
    attempts: Type.Array(VariationAttempt),
  },
  closed,
);

export type VariationState = Static<typeof VariationState>;
export type VariationReason = Static<typeof VariationReason>;
export type SubmitGuess = Static<typeof SubmitGuess>;
export type SubmitReason = Static<typeof SubmitReason>;
export type AskVariationHint = Static<typeof AskVariationHint>;
export type VariationCommand = Static<typeof VariationCommand>;
export type VariationReceipt = Static<typeof VariationReceipt>;
export type VariationAttempt = Static<typeof VariationAttempt>;
export type VariationPart = Static<typeof VariationPart>;
export type VariationPartStatus = Static<typeof VariationPartStatus>;
export type ProblemVariations = Static<typeof ProblemVariations>;
