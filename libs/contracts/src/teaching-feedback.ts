import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackSchema } from './ai-help.js';
import { base64Length, base64Pattern, identifierPattern } from './patterns.js';

const closed = { additionalProperties: false };
export const StepId = Type.String({ pattern: identifierPattern.source });

// The drawing sheet, in pixels at full scale. Exported images are never larger.
export const drawingSheetWidth = 1024;
export const drawingSheetHeight = 768;

export const feedbackTextMaxLength = 500;
export const feedbackInstructionMaxLength = 160;
export const feedbackImageMaxBytes = 512 * 1024;
const feedbackImageMaxLength = base64Length(feedbackImageMaxBytes);
// The body adds a small JSON envelope to the encoded image.
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
    stepId: StepId,
    highlight: Type.Optional(FeedbackRegion),
  },
  closed,
);

// A child submits typed text, a drawing, or both. The server decides whether
// the step needs a model at all.
export const FeedbackRequest = Type.Object(
  {
    stepId: StepId,
    text: Type.Optional(Type.String({ minLength: 1, maxLength: feedbackTextMaxLength })),
    image: Type.Optional(
      Type.String({ pattern: base64Pattern.source, maxLength: feedbackImageMaxLength }),
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

// A region must lie on the drawing sheet, and inside `area` when one is given.
export function regionFits(region: FeedbackRegion, area?: FeedbackRegion) {
  const { x, y, width, height } = region;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
  const bounds = area ?? { x: 0, y: 0, width: 1, height: 1 };
  return (
    x >= bounds.x &&
    y >= bounds.y &&
    x + width <= bounds.x + bounds.width &&
    y + height <= bounds.y + bounds.height
  );
}

// Shown whenever the input cannot be understood reliably; it never counts as a mistake.
export function uncertainFeedback(stepId: string): TeachingFeedback {
  return {
    status: 'uncertain',
    instruction: '我还不能确定你的意思。你可以确认一下，或者换个方法再试。',
    stepId,
  };
}
