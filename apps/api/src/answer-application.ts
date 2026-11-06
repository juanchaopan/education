import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { answersFor } from './learning/repositories/postgres-answer.js';
import { lockLearningSlot } from './learning/repositories/postgres-draft.js';
import { createAnswerService } from './learning/services/answer.js';

export function createAnswering(
  pool: pg.Pool,
  secret: string,
  find = (id: string, version: number) => problemRegistry.find(id, version)?.answering,
) {
  const authorized = childSessionTransaction(pool);
  return createAnswerService(
    (credentials, problem, work) =>
      authorized(credentials, async (client, child) => {
        await lockLearningSlot(client, child, problem);
        return work(answersFor(client, child, problem, secret));
      }),
    find,
  );
}
