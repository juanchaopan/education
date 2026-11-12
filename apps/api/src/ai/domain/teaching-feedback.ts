import {
  feedbackInstructionMaxLength,
  FeedbackRegion,
  regionFits,
  uncertainFeedback,
  type TeachingFeedback,
} from '@education/contracts';
import { Type, type Static } from '@sinclair/typebox';
import { isChildSentence } from './child-sentence.js';
import { parseModelJson } from './model-json.js';
import { givesVerdict, selfCheckSentence } from './verdict.js';

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

const isInstruction = (value: string) => isChildSentence(value, feedbackInstructionMaxLength);

// Shown instead of a model reply that tells the child a guess is right or
// wrong. Its status is the one that never counts as a mistake.
export function selfCheckFeedback(stepId: string): TeachingFeedback {
  return { status: 'uncertain', instruction: selfCheckSentence, stepId };
}

// A reply is refused unless it has exactly the agreed shape, a sentence that
// may be shown to a child and a confidence between zero and one.
export function parseModelFeedback(text: string): ModelFeedback | undefined {
  const value = parseModelJson(ModelFeedback, text);
  if (!value || !isInstruction(value.instruction)) return;
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
