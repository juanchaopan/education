import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { createAiTutoring } from './ai-tutoring-application.js';
import { questionTask } from './ai/services/question-task.js';
import { createTeacherQuestionService } from './ai/services/teacher-question.js';
import { childProblemTransaction } from './child-problem-transaction.js';
import { answeredRight } from './learning/repositories/postgres-answer.js';

export function createTeacherQuestion(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  registry: ProblemRegistry = problemRegistry,
) {
  const gateway = createAiTutoring(pool, env, send);
  const authorized = childProblemTransaction(pool, registry.bookOf);
  return createTeacherQuestionService(
    (credentials, problem) =>
      authorized(credentials, problem, (client, child) => answeredRight(client, child, problem)),
    registry.find,
    (credentials, input, signal) => gateway(questionTask, credentials, input, signal),
  );
}
