import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { withChildSession } from './identity/repositories/postgres-child-session.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { draftsFor } from './learning/repositories/postgres-draft.js';
import { createDraftService } from './learning/services/draft.js';
import { RequestError } from './shared/request-error.js';

const denied = () => new RequestError(401, '登录已失效，请重新登录。');
export function createDrafts(
  pool: pg.Pool,
  available = (id: string, version: number) => !!problemRegistry.find(id, version),
) {
  return createDraftService(async ({ token, csrf }, work) => {
    if (!validToken(token)) throw denied();
    const result = await withChildSession(pool, tokenHash(token), async (client, { id }) => {
      if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
      return work(draftsFor(client, id));
    });
    if (result === undefined) throw denied();
    return result;
  }, available);
}
