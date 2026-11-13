import type pg from 'pg';
import { problemRegistry, type Book } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { readBookAssignments } from './learning/repositories/postgres-book-assignments.js';
import { admit, type BookOf } from './problem-admission.js';

type Credentials = { token?: string; csrf?: string };
export type ChildProblem = { id: string; version: number };

const listed: BookOf = (id, version) => problemRegistry.bookOf(id, version);

// The one way into a child's work on a problem: opening it, answers,
// variations, drafts and the teacher's AI help all come in here with the
// problem they are about, so the rules for who may work on which problem live
// in this one place. It confirms the signed-in child and the CSRF token (401
// or 403), then that the problem is on the list (404) and that its book is
// given to the child and available (403 with the reason), before any of the
// work starts.
export function childProblemTransaction(pool: pg.Pool, bookOf: BookOf = listed) {
  const authorized = childSessionTransaction(pool);
  return <T>(
    credentials: Credentials,
    problem: ChildProblem,
    work: (client: pg.PoolClient, child: string, book: Book) => Promise<T>,
  ) =>
    authorized(credentials, async (client, child) => {
      const given = new Set(
        (await readBookAssignments(client, [child])).map(({ bookId }) => bookId),
      );
      const book = admit({ kind: 'child', given }, bookOf(problem.id, problem.version));
      return work(client, child, book);
    });
}

// The same entry for requests that only need the child let in, such as the
// AI help, whose provider call must not hold a database transaction open.
export function childProblemAuthenticator(pool: pg.Pool, bookOf: BookOf = listed) {
  const transaction = childProblemTransaction(pool, bookOf);
  return async (credentials: Credentials, problem: ChildProblem) => {
    // The transaction reads an undefined result as a missing session.
    await transaction(credentials, problem, async () => true);
  };
}
