import type pg from 'pg';
import type { AuthorizedParent } from '../repositories/session-transaction.js';

// The session and CSRF tokens a signed-in request carries.
export type Credentials = { token?: string; csrf?: string };

// Runs work in a transaction that holds the signed-in parent's family and
// session, or rejects the request before the work starts.
export type ParentTransaction = <T>(
  credentials: Credentials,
  work: (client: pg.PoolClient, parent: AuthorizedParent) => Promise<T>,
) => Promise<T>;
