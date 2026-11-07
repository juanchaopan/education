import type pg from 'pg';
import { cleanupExpiredDrafts } from './database/draft-retention.js';
import { openService } from './database/service-gate.js';
import { createDeletionLedger } from './identity/repositories/postgres-deletion-ledger.js';
import { removeFamily } from './identity/repositories/postgres-family-removal.js';
import { transaction } from './identity/repositories/transaction.js';

export class RestoreCheckError extends Error {}

// Clears a restored application database of what must not come back, then
// opens it. The database stays closed throughout: its service gate has no row
// until open() succeeds, and any failure leaves it that way.
export function createRestoredDatabase(pool: pg.Pool, ledgerPool: pg.Pool) {
  const ledger = createDeletionLedger(ledgerPool);
  return {
    // Removes every family the ledger holds, finished or not, in one
    // transaction, and the drafts that have expired since the backup. Drafts
    // expiring later are hidden by every read and cleared by maintenance.
    async replay() {
      const familyIds = await ledger.recorded();
      await transaction(pool, async (client) => {
        for (const familyId of familyIds) await removeFamily(client, familyId);
      });
      return { families: familyIds.length, expiredDrafts: await cleanupExpiredDrafts(pool) };
    },
    // Reads the ledger again, so an entry recorded after the replay is caught,
    // and opens only when the database holds none of its families.
    async open() {
      const familyIds = await ledger.recorded();
      const { rows } = await pool.query<{ families: number }>(
        'SELECT count(*)::int AS families FROM families WHERE id = ANY($1::uuid[])',
        [familyIds],
      );
      const { families } = rows[0]!;
      if (families)
        throw new RestoreCheckError(`Restored database still holds ${families} deleted families`);
      await openService(pool);
    },
  };
}
