import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { readFamilyEvidence } from './learning/repositories/postgres-family-overview.js';
import { createFamilyOverviewService } from './learning/services/family-overview.js';
import { parentSessionRead } from './parent-session-transaction.js';

export function createFamilyOverview(
  pool: pg.Pool,
  title = (id: string, version: number) => problemRegistry.find(id, version)?.summary.title,
) {
  const read = parentSessionRead(pool);
  return createFamilyOverviewService(
    (token) => read(token, (client, parent) => readFamilyEvidence(client, parent.familyId)),
    title,
  );
}
