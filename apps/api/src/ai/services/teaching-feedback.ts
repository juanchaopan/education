import type { AiHelpFallback, FeedbackRequest, TeachingFeedbackResult } from '@education/contracts';
import type { ProblemPlugin } from '@education/problems/server';
import { feedbackImageUrl } from '../domain/feedback-image.js';
import { modelFeedbackFor, type ModelFeedback } from '../domain/teaching-feedback.js';
import { authoredRuling, authoredStep } from './authored-step.js';
import type { FeedbackModelInput } from './feedback-task.js';
import type { Credentials } from './metered-call.js';

type Problem = { id: string; version: number };
type FeedbackProblem = Pick<ProblemPlugin, 'feedback' | 'checkStep'>;
type ModelReply =
  { status: 'ready'; value: ModelFeedback } | { status: 'fallback'; reason: AiHelpFallback };
type AskModel = (
  credentials: Credentials,
  input: FeedbackModelInput,
  signal?: AbortSignal,
) => Promise<ModelReply>;

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
    const { plugin, step } = authoredStep(find(problem.id, problem.version), stepId);
    const scope = { stepId, area: step.area, drawn: image !== undefined };
    const ruled = await authoredRuling(plugin, scope, text);
    if (ruled) return { status: 'ready', source: 'rules', feedback: ruled };

    const imageUrl = image === undefined ? undefined : feedbackImageUrl(image);
    if (image !== undefined && !imageUrl) return { status: 'fallback', reason: 'invalid-input' };
    const reply = await askModel(credentials, { prompt: step.prompt, text, imageUrl }, signal);
    if (reply.status === 'fallback') return reply;
    return { status: 'ready', source: 'ai', feedback: modelFeedbackFor(reply.value, scope) };
  };
}

export type TeachingFeedbackService = ReturnType<typeof createTeachingFeedbackService>;
