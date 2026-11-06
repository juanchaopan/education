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

function authoredStep(plugin: FeedbackProblem, stepId: string): FeedbackStep {
  const steps = plugin.feedback;
  const step = steps && Object.hasOwn(steps, stepId) ? steps[stepId] : undefined;
  if (!step) throw new RequestError(404, '这一步暂时不能提交。');
  return step;
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
    { stepId, text, image }: FeedbackRequest,
    signal?: AbortSignal,
  ): Promise<TeachingFeedbackResult> => {
    await authenticate(credentials);
    const plugin = find(problem.id, problem.version);
    if (!plugin) throw new RequestError(404, '这一步暂时不能提交。');
    const step = authoredStep(plugin, stepId);
    const scope: FeedbackStepScope = { stepId, area: step.area };
    const rule = await plugin.checkStep?.({ stepId, answer: text });
    const ruled = rule && ruleFeedbackFor(rule, scope);
    if (ruled) return { status: 'ready', source: 'rules', feedback: ruled };

    const imageUrl = image === undefined ? undefined : feedbackImageUrl(image);
    if (image !== undefined && !imageUrl) return { status: 'fallback', reason: 'invalid-input' };
    const reply = await askModel(credentials, { prompt: step.prompt, text, imageUrl }, signal);
    if (reply.status === 'fallback') return reply;
    return { status: 'ready', source: 'ai', feedback: modelFeedbackFor(reply.value, scope) };
  };
}

export type TeachingFeedbackService = ReturnType<typeof createTeachingFeedbackService>;
