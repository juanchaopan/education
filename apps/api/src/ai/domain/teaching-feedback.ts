import {
  feedbackInstructionMaxLength,
  FeedbackRegion,
  regionFits,
  uncertainFeedback,
  type TeachingFeedback,
} from '@education/contracts';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { givesVerdict } from './verdict.js';

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

// `drawn` is whether the child submitted a drawing, the only thing a highlight can point at.
export type FeedbackStepScope = { stepId: string; area?: FeedbackRegion; drawn: boolean };

// HTML tags and entities, markdown, links and control characters never belong in a sentence
// shown to a child. Comparison signs in maths feedback are ordinary text.
const unsafeText = /<[a-zA-Z/!?]|&#?\w+;|`|\]\(|:\/\/|www\.|[\p{Cc}\p{Cf}]/u;

function isInstruction(value: string) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    value.length <= feedbackInstructionMaxLength &&
    !unsafeText.test(value)
  );
}

// Shown instead of a model reply that tells the child a guess is right or
// wrong. It judges nothing, so its status is the one that never counts as a
// mistake, and it sends the child back to the scene to check.
export function selfCheckFeedback(stepId: string): TeachingFeedback {
  return {
    status: 'uncertain',
    instruction: '这个要你自己来核对哦。看看画面，一步一步数一数、想一想。',
    stepId,
  };
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
// whenever the reply cannot be trusted and to check for themselves whenever it
// judges what the child said. The reply decides only what the child reads and
// which region is outlined.
export function modelFeedbackFor(reply: ModelFeedback, scope: FeedbackStepScope): TeachingFeedback {
  const { stepId, area, drawn } = scope;
  const highlight = drawn ? reply.highlight : null;
  if (reply.injection || reply.confidence < MIN_FEEDBACK_CONFIDENCE)
    return uncertainFeedback(stepId);
  if (highlight && !regionFits(highlight, area)) return uncertainFeedback(stepId);
  if (givesVerdict(reply.instruction)) return selfCheckFeedback(stepId);
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
