import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { withParentSession } from './identity/repositories/session-transaction.js';
import { tokenHash, validToken } from './identity/services/session-security.js';
import { readFamilyEvidence } from './learning/repositories/postgres-family-overview.js';
import { createFamilyOverviewService } from './learning/services/family-overview.js';
import { RequestError } from './shared/request-error.js';

export function createFamilyOverview(
  pool: pg.Pool,
  title = (id: string, version: number) => problemRegistry.find(id, version)?.summary.title,
) {
  return createFamilyOverviewService(async (token) => {
    if (!validToken(token)) throw new RequestError(401, '登录状态已失效，请重新登录。');
    return withParentSession(pool, tokenHash(token), (client, parent) =>
      readFamilyEvidence(client, parent.familyId),
    );
  }, title);
}
