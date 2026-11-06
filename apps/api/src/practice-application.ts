import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { withParentSession } from './identity/repositories/session-transaction.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { createPracticeService } from './learning/services/practice.js';
import { RequestError } from './shared/request-error.js';

export function createPracticeAssignments(pool: pg.Pool, registry = problemRegistry) {
  return createPracticeService(
    ({ token, csrf }, childId, work) => {
      if (!validToken(token)) throw new RequestError(401, '登录状态已失效，请重新登录。');
      return withParentSession(pool, tokenHash(token), async (client, parent) => {
        if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
        const child = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
          childId,
          parent.familyId,
        ]);
        if (!child.rowCount) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
        return work(client);
      });
    },
    childSessionTransaction(pool),
    (id, version) => registry.find(id, version)?.summary.title,
  );
}
