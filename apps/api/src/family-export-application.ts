import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { createFamilyExportService } from './identity/services/family-export.js';
import { createChildLearningExport } from './learning/services/child-learning-export.js';
import { parentSessionTransaction } from './parent-session-transaction.js';

export function createFamilyExport(pool: pg.Pool, registry = problemRegistry) {
  return createFamilyExportService(
    parentSessionTransaction(pool),
    createChildLearningExport((id, version) => registry.find(id, version)?.summary.title),
  );
}
