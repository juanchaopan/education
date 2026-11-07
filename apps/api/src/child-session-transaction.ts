import type pg from 'pg';
import { withChildSession } from './identity/repositories/postgres-child-session.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { RequestError } from './shared/request-error.js';

type Credentials = { token?: string; csrf?: string };

export function childSessionTransaction(pool: pg.Pool) {
  return async <T>(
    { token, csrf }: Credentials,
    work: (client: pg.PoolClient, child: string) => Promise<T>,
  ) => {
    const denied = () => new RequestError(401, '登录已失效，请重新登录。');
    if (!validToken(token)) throw denied();
    const result = await withChildSession(pool, tokenHash(token), (client, { id }) => {
      if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
      return work(client, id);
    });
    if (result === undefined) throw denied();
    return result;
  };
}

// Confirms a signed-in child with a matching CSRF token, or throws 401 or 403.
export function childAuthenticator(pool: pg.Pool) {
  const authorized = childSessionTransaction(pool);
  return async (credentials: Credentials) => {
    // The transaction reads an undefined result as a missing session.
    await authorized(credentials, async () => true);
  };
}
