import type pg from 'pg';
import { withChildSession } from './identity/repositories/postgres-child-session.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { RequestError } from './shared/request-error.js';

export function childSessionTransaction(pool: pg.Pool) {
  return async <T>(
    { token, csrf }: { token?: string; csrf?: string },
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
