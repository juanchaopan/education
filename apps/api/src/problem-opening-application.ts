import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import type { ProblemOpening } from './catalog/routes/catalog.js';
import { childSessionTransaction } from './child-session-transaction.js';
import { markBookOpened } from './learning/repositories/postgres-book-assignments.js';
import { RequestError } from './shared/request-error.js';

const signedOut = (error: unknown) =>
  error instanceof RequestError && [401, 403].includes(error.statusCode);

// A signed-in child opening a problem has opened its book, which then stops
// being new to the child. Anyone else opens it without a record. The
// transaction reads an undefined result as a missing session, so the marking
// answers that it was done.
export function createProblemOpening(
  pool: pg.Pool,
  registry: ProblemRegistry = problemRegistry,
): ProblemOpening {
  const child = childSessionTransaction(pool);
  return async (credentials, problem) => {
    const book = registry.bookOf(problem.id, problem.version);
    if (!book) return;
    try {
      await child(credentials, async (client, childId) => {
        await markBookOpened(client, childId, book.id);
        return true;
      });
    } catch (error) {
      if (!signedOut(error)) throw error;
    }
  };
}
