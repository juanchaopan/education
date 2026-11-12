import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { createAiTutoring } from './ai-tutoring-application.js';
import { feedbackTask } from './ai/services/feedback-task.js';
import { createTeachingFeedbackService } from './ai/services/teaching-feedback.js';
import { childProblemAuthenticator } from './child-problem-transaction.js';

export function createTeachingFeedback(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  find = (id: string, version: number) => problemRegistry.find(id, version),
) {
  const gateway = createAiTutoring(pool, env, send);
  return createTeachingFeedbackService(
    childProblemAuthenticator(pool),
    find,
    (credentials, input, signal) => gateway(feedbackTask, credentials, input, signal),
  );
}
