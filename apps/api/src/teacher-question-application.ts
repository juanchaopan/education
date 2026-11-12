import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { createAiTutoring } from './ai-tutoring-application.js';
import { questionTask } from './ai/services/question-task.js';
import { createTeacherQuestionService } from './ai/services/teacher-question.js';
import { childAuthenticator } from './child-session-transaction.js';

export function createTeacherQuestion(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  find = (id: string, version: number) => problemRegistry.find(id, version),
) {
  const gateway = createAiTutoring(pool, env, send);
  return createTeacherQuestionService(
    childAuthenticator(pool),
    find,
    (credentials, input, signal) => gateway(questionTask, credentials, input, signal),
  );
}
