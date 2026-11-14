import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { childProblemTransaction } from './child-problem-transaction.js';
import { lockLearningSlot } from './learning/repositories/postgres-draft.js';
import { variationsFor } from './learning/repositories/postgres-variation.js';
import { createVariationService } from './learning/services/variation.js';

// Variation answers take the same per-problem lock as final answers and
// drafts, so a variation is always recorded against the round the final
// answer completed last.
export function createVariation(
  pool: pg.Pool,
  secret: string,
  registry: ProblemRegistry = problemRegistry,
) {
  const authorized = childProblemTransaction(pool, registry.bookOf);
  return createVariationService(
    (credentials, problem, work) =>
      authorized(credentials, problem, async (client, child) => {
        await lockLearningSlot(client, child, problem);
        return work(variationsFor(client, child, problem, secret));
      }),
    (id, version) => registry.find(id, version)?.variation,
  );
}
