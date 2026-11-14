import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { childProblemTransaction } from './child-problem-transaction.js';
import { answersFor } from './learning/repositories/postgres-answer.js';
import { lockLearningSlot } from './learning/repositories/postgres-draft.js';
import { createAnswerService } from './learning/services/answer.js';

export function createAnswering(
  pool: pg.Pool,
  secret: string,
  registry: ProblemRegistry = problemRegistry,
) {
  const authorized = childProblemTransaction(pool, registry.bookOf);
  return createAnswerService(
    (credentials, problem, work) =>
      authorized(credentials, problem, async (client, child) => {
        await lockLearningSlot(client, child, problem);
        return work(answersFor(client, child, problem, secret));
      }),
    (id, version) => registry.find(id, version)?.answering,
  );
}
