import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { draftsFor } from './learning/repositories/postgres-draft.js';
import { createDraftService } from './learning/services/draft.js';
export function createDrafts(
  pool: pg.Pool,
  available = (id: string, version: number) => !!problemRegistry.find(id, version),
) {
  const authorized = childSessionTransaction(pool);
  return createDraftService(
    (credentials, work) => authorized(credentials, (client, id) => work(draftsFor(client, id))),
    available,
  );
}
