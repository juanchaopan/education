import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { familyLearningFor } from './learning/repositories/postgres-family-overview.js';
import {
  createFamilyOverviewService,
  type Catalogue,
} from './learning/services/family-overview.js';
import { parentSessionRead } from './parent-session-transaction.js';

const registry: Catalogue = {
  title: (id, version) => problemRegistry.find(id, version)?.summary.title,
  latest: (id) => {
    const current = problemRegistry.current.find((summary) => summary.id === id);
    return current && { version: current.version, title: current.title };
  },
};

export function createFamilyOverview(
  pool: pg.Pool,
  defaultTimeZone: string,
  catalogue = registry,
  now?: () => Date,
) {
  const read = parentSessionRead(pool);
  return createFamilyOverviewService(
    (token, work) =>
      read(token, (client, parent) =>
        work(familyLearningFor(client, parent.familyId, defaultTimeZone)),
      ),
    catalogue,
    now,
  );
}
