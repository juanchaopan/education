import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { createPracticeService } from './learning/services/practice.js';
import { parentFamilyTransactions } from './parent-family-transactions.js';

export function createPracticeAssignments(pool: pg.Pool, registry = problemRegistry) {
  return createPracticeService(
    parentFamilyTransactions(pool).child,
    childSessionTransaction(pool),
    (id, version) => registry.find(id, version)?.summary.title,
  );
}
