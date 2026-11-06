import {
  feedbackInstructionMaxLength,
  uncertainFeedbackInstruction,
  type FeedbackRegion,
  type TeachingFeedback,
} from '@education/contracts';

// Below this self-reported confidence the model's reading of the child's input
// is treated as unreliable.
export const MIN_FEEDBACK_CONFIDENCE = 0.6;

export type ModelFeedback = {
  status: 'correct' | 'needs-work' | 'uncertain';
  instruction: string;
  confidence: number;
  // The model's own report that the child's input tried to change its rules.
  injection: boolean;
  highlight: FeedbackRegion | null;
};
export type FeedbackStepScope = { stepId: string; area?: FeedbackRegion };

const replyKeys = 'confidence,highlight,injection,instruction,status';
const regionKeys = 'height,width,x,y';
const modelStatuses: readonly unknown[] = ['correct', 'needs-work', 'uncertain'];
// Markup, links and control characters never belong in a sentence shown to a child.
const unsafeText = /[<>&`]|\]\(|:\/\/|www\.|[\p{Cc}\p{Cf}]/u;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hasKeys(value: Record<string, unknown>, expected: string) {
  return Object.keys(value).sort().join() === expected;
}

function isRegion(value: unknown): value is FeedbackRegion {
  const region = record(value);
  return (
    !!region &&
    hasKeys(region, regionKeys) &&
    Object.values(region).every((part) => typeof part === 'number' && Number.isFinite(part))
  );
}

function isInstruction(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= feedbackInstructionMaxLength &&
    !unsafeText.test(value)
  );
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isModelFeedback(value: unknown): value is ModelFeedback {
  const reply = record(value);
  return (
    !!reply &&
    hasKeys(reply, replyKeys) &&
    modelStatuses.includes(reply.status) &&
    isInstruction(reply.instruction) &&
    isConfidence(reply.confidence) &&
    typeof reply.injection === 'boolean' &&
    (reply.highlight === null || isRegion(reply.highlight))
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
  return isModelFeedback(value) ? value : undefined;
}

// A region must lie on the drawing sheet, and inside the step's markable area when it has one.
export function regionFits(region: FeedbackRegion, area?: FeedbackRegion) {
  const { x, y, width, height } = region;
  const bounds = area ?? { x: 0, y: 0, width: 1, height: 1 };
  return (
    width > 0 &&
    height > 0 &&
    x >= bounds.x &&
    y >= bounds.y &&
    x + width <= bounds.x + bounds.width &&
    y + height <= bounds.y + bounds.height
  );
}

export function uncertainFeedback(stepId: string): TeachingFeedback {
  return { status: 'uncertain', instruction: uncertainFeedbackInstruction, stepId };
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
