import type { AiHelpFallback, FeedbackRequest, TeachingFeedbackResult } from '@education/contracts';
import type { FeedbackStep, ProblemPlugin } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { feedbackImageUrl } from '../domain/feedback-image.js';
import {
  modelFeedbackFor,
  ruleFeedbackFor,
  type FeedbackStepScope,
  type ModelFeedback,
} from '../domain/teaching-feedback.js';
import type { FeedbackModelInput } from './feedback-task.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
type FeedbackProblem = Pick<ProblemPlugin, 'feedback' | 'checkStep'>;
type ModelReply =
  { status: 'ready'; value: ModelFeedback } | { status: 'fallback'; reason: AiHelpFallback };
type AskModel = (
  credentials: Credentials,
  input: FeedbackModelInput,
  signal?: AbortSignal,
) => Promise<ModelReply>;

function authoredStep(plugin: FeedbackProblem | undefined, stepId: string): FeedbackStep {
  const steps = plugin?.feedback;
  const step = steps && Object.hasOwn(steps, stepId) ? steps[stepId] : undefined;
  if (!step) throw new RequestError(404, '这一步暂时不能提交。');
  return step;
}

async function askAboutStep(
  ask: (input: FeedbackModelInput) => Promise<ModelReply>,
  step: FeedbackStep,
  scope: FeedbackStepScope,
  { text, image }: FeedbackRequest,
): Promise<TeachingFeedbackResult> {
  const imageUrl = image === undefined ? undefined : feedbackImageUrl(image);
  if (image !== undefined && !imageUrl) return { status: 'fallback', reason: 'invalid-input' };
  const reply = await ask({ prompt: step.prompt, text, imageUrl });
  if (reply.status === 'fallback') return reply;
  return { status: 'ready', source: 'ai', feedback: modelFeedbackFor(reply.value, scope) };
}

// Feedback is advice only. Nothing here records an attempt, changes progress or
// touches permissions, so a late or failed model reply never alters learning.
export function createTeachingFeedbackService(
  authenticate: (credentials: Credentials) => Promise<void>,
  find: (id: string, version: number) => FeedbackProblem | undefined,
  askModel: AskModel,
) {
  return async (
    credentials: Credentials,
    problem: Problem,
    request: FeedbackRequest,
    signal?: AbortSignal,
  ): Promise<TeachingFeedbackResult> => {
    await authenticate(credentials);
    const plugin = find(problem.id, problem.version);
    const step = authoredStep(plugin, request.stepId);
    const scope = { stepId: request.stepId, area: step.area };
    const rule = await plugin?.checkStep?.({ stepId: request.stepId, answer: request.text });
    const ruled = rule && ruleFeedbackFor(rule, scope);
    if (ruled) return { status: 'ready', source: 'rules', feedback: ruled };
    return askAboutStep((input) => askModel(credentials, input, signal), step, scope, request);
  };
}

export type TeachingFeedbackService = ReturnType<typeof createTeachingFeedbackService>;
