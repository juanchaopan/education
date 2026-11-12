import type pg from 'pg';
import { childSessionTransaction } from './child-session-transaction.js';

type Credentials = { token?: string; csrf?: string };
export type ChildProblem = { id: string; version: number };

// The one way into a child's work on a problem: answers, drafts and the
// teacher's AI help all come in here with the problem they are about, so the
// rules for who may work on which problem live in this one place. Today it
// confirms the signed-in child and the CSRF token, or throws 401 or 403.
export function childProblemTransaction(pool: pg.Pool) {
  const authorized = childSessionTransaction(pool);
  return <T>(
    credentials: Credentials,
    _problem: ChildProblem,
    work: (client: pg.PoolClient, child: string) => Promise<T>,
  ) => authorized(credentials, work);
}

// The same entry for requests that only need the child let in, such as the
// AI help, whose provider call must not hold a database transaction open.
export function childProblemAuthenticator(pool: pg.Pool) {
  const transaction = childProblemTransaction(pool);
  return async (credentials: Credentials, problem: ChildProblem) => {
    // The transaction reads an undefined result as a missing session.
    await transaction(credentials, problem, async () => true);
  };
}
