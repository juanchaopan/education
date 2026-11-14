import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { childProblemTransaction } from './child-problem-transaction.js';
import { draftsFor } from './learning/repositories/postgres-draft.js';
import { createDraftService } from './learning/services/draft.js';

export function createDrafts(pool: pg.Pool, registry: ProblemRegistry = problemRegistry) {
  const authorized = childProblemTransaction(pool, registry.bookOf);
  return createDraftService((credentials, problem, work) =>
    authorized(credentials, problem, (client, id) => work(draftsFor(client, id))),
  );
}
