import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { createPreviewService } from './learning/services/preview.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { admit } from './problem-admission.js';

// A verified parent previews any problem whose book is available, by the
// problem's own rules for its answer and its variation. The transaction only
// lets the parent in; it writes nothing.
export function createPreview(pool: pg.Pool, registry: ProblemRegistry = problemRegistry) {
  const parent = parentSessionTransaction(pool);
  return createPreviewService((credentials, problem, work) =>
    parent(credentials, async () => {
      admit({ kind: 'parent' }, registry.bookOf(problem.id, problem.version));
      const plugin = registry.find(problem.id, problem.version);
      return work({ answering: plugin?.answering, variation: plugin?.variation });
    }),
  );
}
