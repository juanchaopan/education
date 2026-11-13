import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { familyLearningFor } from './learning/repositories/postgres-family-overview.js';
import { createFamilyOverviewService } from './learning/services/family-overview.js';
import { parentSessionRead } from './parent-session-transaction.js';

export function createFamilyOverview(
  pool: pg.Pool,
  defaultTimeZone: string,
  title = (id: string, version: number) => problemRegistry.find(id, version)?.summary.title,
  now?: () => Date,
) {
  const read = parentSessionRead(pool);
  return createFamilyOverviewService(
    (token, work) =>
      read(token, (client, parent) =>
        work(familyLearningFor(client, parent.familyId, defaultTimeZone)),
      ),
    title,
    now,
  );
}
