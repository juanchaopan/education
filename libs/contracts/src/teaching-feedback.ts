import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackSchema } from './ai-help.js';

const closed = { additionalProperties: false };
const identifier = /^[a-z][a-z0-9-]{0,63}$/;
const stepId = Type.String({ pattern: identifier.source });

export const feedbackTextMaxLength = 500;
export const feedbackInstructionMaxLength = 160;
export const feedbackImageMaxBytes = 512 * 1024;
// Four base64 characters carry three bytes; the body adds a small JSON envelope.
const feedbackImageMaxLength = Math.ceil(feedbackImageMaxBytes / 3) * 4;
export const feedbackBodyLimit = feedbackImageMaxLength + 4 * 1024;

// Fractions of the drawing sheet, with the origin at its top-left corner.
export const FeedbackRegion = Type.Object(
  { x: Type.Number(), y: Type.Number(), width: Type.Number(), height: Type.Number() },
  closed,
);

export const TeachingFeedback = Type.Object(
  {
    status: Type.Union([
      Type.Literal('correct'),
      Type.Literal('needs-work'),
      Type.Literal('uncertain'),
      Type.Literal('recognition-failed'),
    ]),
    instruction: Type.String({ minLength: 1, maxLength: feedbackInstructionMaxLength }),
    stepId,
    highlight: Type.Optional(FeedbackRegion),
  },
  closed,
);

// A child submits typed text, a drawing, or both. The server decides whether
// the step needs a model at all.
export const FeedbackRequest = Type.Object(
  {
    stepId,
    text: Type.Optional(Type.String({ minLength: 1, maxLength: feedbackTextMaxLength })),
    image: Type.Optional(
      Type.String({ pattern: '^[A-Za-z0-9+/]+={0,2}$', maxLength: feedbackImageMaxLength }),
    ),
  },
  { ...closed, minProperties: 2 },
);

export const TeachingFeedbackResult = Type.Union([
  Type.Object(
    {
      status: Type.Literal('ready'),
      source: Type.Union([Type.Literal('rules'), Type.Literal('ai')]),
      feedback: TeachingFeedback,
    },
    closed,
  ),
  Type.Object({ status: Type.Literal('fallback'), reason: AiHelpFallbackSchema }, closed),
]);

export type FeedbackRegion = Static<typeof FeedbackRegion>;
export type TeachingFeedback = Static<typeof TeachingFeedback>;
export type FeedbackRequest = Static<typeof FeedbackRequest>;
export type TeachingFeedbackResult = Static<typeof TeachingFeedbackResult>;
