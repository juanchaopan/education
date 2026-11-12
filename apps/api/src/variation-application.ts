import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { lockLearningSlot } from './learning/repositories/postgres-draft.js';
import { variationsFor } from './learning/repositories/postgres-variation.js';
import { createVariationService } from './learning/services/variation.js';

// Variation answers take the same per-problem lock as final answers and
// drafts, so a variation is always recorded against the round the final
// answer completed last.
export function createVariation(
  pool: pg.Pool,
  secret: string,
  find = (id: string, version: number) => problemRegistry.find(id, version)?.variation,
) {
  const authorized = childSessionTransaction(pool);
  return createVariationService(
    (credentials, problem, work) =>
      authorized(credentials, async (client, child) => {
        await lockLearningSlot(client, child, problem);
        return work(variationsFor(client, child, problem, secret));
      }),
    find,
  );
}
