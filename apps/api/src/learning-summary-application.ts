import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { readLearningEvidence } from './learning/repositories/postgres-learning-summary.js';
import { createLearningSummaryService } from './learning/services/learning-summary.js';
import { parentSessionRead } from './parent-session-transaction.js';
import { RequestError } from './shared/request-error.js';

export function createLearningSummary(
  pool: pg.Pool,
  title = (id: string, version: number) => problemRegistry.find(id, version)?.summary.title,
) {
  const read = parentSessionRead(pool);
  return createLearningSummaryService(
    (token, childId, limit, offset) =>
      read(token, async (client, parent) => {
        const child = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
          childId,
          parent.familyId,
        ]);
        if (!child.rowCount) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
        return readLearningEvidence(client, childId, { limit, offset });
      }),
    title,
  );
}
