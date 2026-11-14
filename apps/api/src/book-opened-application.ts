import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { childProblemTransaction } from './child-problem-transaction.js';
import type { MarkBookOpened } from './learning/routes/book-opened.js';
import { markBookOpened } from './learning/repositories/postgres-book-assignments.js';

// A child who opens a problem of a book given to them and available has
// opened the book, the first time only; any other book is refused as the
// child's problem endpoints refuse it. The transaction reads an undefined
// result as a missing session, so the marking answers that it was done.
export function createBookOpened(
  pool: pg.Pool,
  registry: ProblemRegistry = problemRegistry,
): MarkBookOpened {
  const child = childProblemTransaction(pool, registry.bookOf);
  return async (credentials, problem) => {
    await child(credentials, problem, async (client, childId, book) => {
      await markBookOpened(client, childId, book.id);
      return true;
    });
  };
}
