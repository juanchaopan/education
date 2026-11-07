import type pg from 'pg';
import { withParentSession } from './identity/repositories/session-transaction.js';
import type { ParentTransaction } from './identity/services/parent-transaction.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { RequestError } from './shared/request-error.js';

// Runs work for a signed-in parent with a matching CSRF token, or rejects with
// 401 or 403. The CSRF token derives from the session token, so a forged
// request is refused before it opens a transaction or takes a family lock.
export function parentSessionTransaction(pool: pg.Pool): ParentTransaction {
  return async ({ token, csrf }, work) => {
    if (!validToken(token)) throw new RequestError(401, '登录状态已失效，请重新登录。');
    if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
    return withParentSession(pool, tokenHash(token), work);
  };
}
