import type pg from 'pg';
import type { ProblemMode, ProblemOpening } from '@education/contracts';
import { problemRegistry, type Book, type ProblemRegistry } from '@education/problems/server';
import type { OpenProblem } from './catalog/routes/catalog.js';
import { childProblemTransaction, type ChildProblem } from './child-problem-transaction.js';
import { markBookOpened } from './learning/repositories/postgres-book-assignments.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { admit } from './problem-admission.js';
import { RequestError } from './shared/request-error.js';

const noChild = (error: unknown) => error instanceof RequestError && error.statusCode === 401;

// Opens a problem for whoever is signed in. A child, if the session is a
// child's, practises it, and opening it marks its book opened, so the book
// stops being new; otherwise a parent whose email is verified previews it,
// and nothing is written. Anyone else is refused with 401, whether the
// problem exists or not.
export function createProblemOpening(
  pool: pg.Pool,
  registry: ProblemRegistry = problemRegistry,
): OpenProblem {
  const child = childProblemTransaction(pool, registry.bookOf);
  const parent = parentSessionTransaction(pool);
  // Only a problem on the list is admitted, so its summary is there.
  const opening = (problem: ChildProblem, mode: ProblemMode, book: Book): ProblemOpening => ({
    ...registry.summary(problem.id, problem.version)!,
    mode,
    book: book.id,
  });
  const preview = (problem: ChildProblem) =>
    opening(
      problem,
      'preview',
      admit({ kind: 'parent' }, registry.bookOf(problem.id, problem.version)),
    );
  return async (credentials, problem) => {
    try {
      return await child(credentials, problem, async (client, childId, book) => {
        await markBookOpened(client, childId, book.id);
        return opening(problem, 'practice', book);
      });
    } catch (error) {
      if (!noChild(error)) throw error;
    }
    return parent(credentials, async () => preview(problem));
  };
}
