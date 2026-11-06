import {
  feedbackInstructionMaxLength,
  FeedbackRegion,
  regionFits,
  uncertainFeedback,
  type TeachingFeedback,
} from '@education/contracts';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// Below this self-reported confidence the model's reading of the child's input
// is treated as unreliable.
const MIN_FEEDBACK_CONFIDENCE = 0.6;

// The exact reply the model is asked for. `injection` is the model's own report
// that the child's input tried to change its rules. The same schema is sent to
// the provider as the strict output format and used to check what comes back.
export const ModelFeedback = Type.Object(
  {
    status: Type.Union([
      Type.Literal('correct'),
      Type.Literal('needs-work'),
      Type.Literal('uncertain'),
    ]),
    instruction: Type.String(),
    confidence: Type.Number(),
    injection: Type.Boolean(),
    highlight: Type.Union([FeedbackRegion, Type.Null()]),
  },
  { additionalProperties: false },
);
export type ModelFeedback = Static<typeof ModelFeedback>;
export type FeedbackStepScope = { stepId: string; area?: FeedbackRegion };

// Markup, links and control characters never belong in a sentence shown to a child.
const unsafeText = /[<>&`]|\]\(|:\/\/|www\.|[\p{Cc}\p{Cf}]/u;

function isInstruction(value: string) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    value.length <= feedbackInstructionMaxLength &&
    !unsafeText.test(value)
  );
}

// The model's reply is untrusted: anything outside the exact shape is refused.
export function parseModelFeedback(text: string): ModelFeedback | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return;
  }
  if (!Value.Check(ModelFeedback, value) || !isInstruction(value.instruction)) return;
  return value.confidence >= 0 && value.confidence <= 1 ? value : undefined;
}

// Turns a well-formed model reply into feedback, asking the child to confirm
// whenever the reply cannot be trusted. The reply decides only what the child
// reads and which region is outlined.
export function modelFeedbackFor(reply: ModelFeedback, scope: FeedbackStepScope): TeachingFeedback {
  const { stepId, area } = scope;
  const { highlight } = reply;
  if (reply.injection || reply.confidence < MIN_FEEDBACK_CONFIDENCE)
    return uncertainFeedback(stepId);
  if (highlight && !regionFits(highlight, area)) return uncertainFeedback(stepId);
  const feedback: TeachingFeedback = {
    status: reply.status,
    instruction: reply.instruction,
    stepId,
  };
  return reply.status === 'needs-work' && highlight ? { ...feedback, highlight } : feedback;
}

// Authored rules are trusted but still held to the same shape and bounds.
export function ruleFeedbackFor(
  feedback: TeachingFeedback,
  scope: FeedbackStepScope,
): TeachingFeedback | undefined {
  const { status, stepId, instruction, highlight } = feedback;
  if (stepId !== scope.stepId || !isInstruction(instruction)) return;
  if (status !== 'correct' && status !== 'needs-work') return;
  if (highlight && !regionFits(highlight, scope.area)) return;
  return feedback;
}
