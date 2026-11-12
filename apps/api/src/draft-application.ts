import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childProblemTransaction } from './child-problem-transaction.js';
import { draftsFor } from './learning/repositories/postgres-draft.js';
import { createDraftService } from './learning/services/draft.js';

export function createDrafts(
  pool: pg.Pool,
  available = (id: string, version: number) => !!problemRegistry.find(id, version),
) {
  const authorized = childProblemTransaction(pool);
  return createDraftService(
    (credentials, problem, work) =>
      authorized(credentials, problem, (client, id) => work(draftsFor(client, id))),
    available,
  );
}
