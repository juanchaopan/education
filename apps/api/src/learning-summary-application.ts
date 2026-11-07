import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { withParentSession } from './identity/repositories/session-transaction.js';
import { tokenHash, validToken } from './identity/services/session-security.js';
import { readLearningEvidence } from './learning/repositories/postgres-learning-summary.js';
import { createLearningSummaryService } from './learning/services/learning-summary.js';
import { RequestError } from './shared/request-error.js';

export function createLearningSummary(
  pool: pg.Pool,
  title = (id: string, version: number) => problemRegistry.find(id, version)?.summary.title,
) {
  return createLearningSummaryService(async (token, childId, limit, offset) => {
    if (!validToken(token)) throw new RequestError(401, '登录状态已失效，请重新登录。');
    return withParentSession(pool, tokenHash(token), async (client, parent) => {
      const child = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
        childId,
        parent.familyId,
      ]);
      if (!child.rowCount) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
      return readLearningEvidence(client, childId, { limit, offset });
    });
  }, title);
}
