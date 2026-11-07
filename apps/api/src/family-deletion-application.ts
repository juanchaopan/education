import type pg from 'pg';
import { createDeletionLedger } from './identity/repositories/postgres-deletion-ledger.js';
import { removeFamily } from './identity/repositories/postgres-family-removal.js';
import { transaction } from './identity/repositories/transaction.js';
import { createFamilyDeletionService } from './identity/services/family-deletion.js';
import { parentSessionTransaction } from './parent-session-transaction.js';

// Without a ledger database there is no deletion service, rather than one that
// removes a family a restored backup could bring back.
export function createFamilyDeletion(pool: pg.Pool, ledgerPool?: pg.Pool, remove = removeFamily) {
  if (!ledgerPool) return undefined;
  return createFamilyDeletionService({
    transaction: parentSessionTransaction(pool),
    separately: (work) => transaction(pool, work),
    ledger: createDeletionLedger(ledgerPool),
    remove,
  });
}
