import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { createAiTutoring } from './ai-tutoring-application.js';
import { questionTask } from './ai/services/question-task.js';
import { createTeacherQuestionService } from './ai/services/teacher-question.js';
import { childSessionTransaction } from './child-session-transaction.js';
import { answeredRight } from './learning/repositories/postgres-answer.js';

export function createTeacherQuestion(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  find = (id: string, version: number) => problemRegistry.find(id, version),
) {
  const gateway = createAiTutoring(pool, env, send);
  const authorized = childSessionTransaction(pool);
  return createTeacherQuestionService(
    (credentials, problem) =>
      authorized(credentials, (client, child) => answeredRight(client, child, problem)),
    find,
    (credentials, input, signal) => gateway(questionTask, credentials, input, signal),
  );
}
