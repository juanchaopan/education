import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { createPracticeService } from './learning/services/practice.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { RequestError } from './shared/request-error.js';

export function createPracticeAssignments(pool: pg.Pool, registry = problemRegistry) {
  const parentTransaction = parentSessionTransaction(pool);
  return createPracticeService(
    (credentials, childId, work) =>
      parentTransaction(credentials, async (client, parent) => {
        const child = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
          childId,
          parent.familyId,
        ]);
        if (!child.rowCount) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
        return work(client);
      }),
    childSessionTransaction(pool),
    (id, version) => registry.find(id, version)?.summary.title,
  );
}
