import type pg from 'pg';
import {
  withParentSession,
  type AuthorizedParent,
} from './identity/repositories/session-transaction.js';
import type { ParentTransaction } from './identity/services/parent-transaction.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { RequestError } from './shared/request-error.js';

type ParentWork<T> = (client: pg.PoolClient, parent: AuthorizedParent) => Promise<T>;

function signedIn(token: string | undefined): asserts token is string {
  if (!validToken(token)) throw new RequestError(401, '登录状态已失效，请重新登录。');
}

// Runs a read for a signed-in parent, or rejects with 401. A read changes
// nothing, so it needs no CSRF token.
export function parentSessionRead(pool: pg.Pool) {
  return <T>(token: string | undefined, work: ParentWork<T>) => {
    signedIn(token);
    return withParentSession(pool, tokenHash(token), work);
  };
}

// Runs work for a signed-in parent with a matching CSRF token, or rejects with
// 401 or 403. The CSRF token derives from the session token, so a forged
// request is refused before it opens a transaction or takes a family lock.
export function parentSessionTransaction(pool: pg.Pool): ParentTransaction {
  return async ({ token, csrf }, work) => {
    signedIn(token);
    if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
    return withParentSession(pool, tokenHash(token), work);
  };
}
