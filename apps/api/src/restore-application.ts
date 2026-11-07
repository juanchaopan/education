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
    // transaction, and the drafts that have expired since the backup.
    async replay() {
      const familyIds = await ledger.recorded();
      await transaction(pool, async (client) => {
        for (const familyId of familyIds) await removeFamily(client, familyId);
      });
      return { families: familyIds.length, expiredDrafts: await cleanupExpiredDrafts(pool) };
    },
    // Reads the ledger again, so an entry recorded after the replay is caught,
    // and opens only when the database holds none of its families and no
    // expired draft.
    async open() {
      const familyIds = await ledger.recorded();
      const { rows } = await pool.query<{ families: number; drafts: number }>(
        `SELECT (SELECT count(*) FROM families WHERE id = ANY($1::uuid[]))::int AS families,
                (SELECT count(*) FROM drafts WHERE expires_at <= statement_timestamp())::int AS drafts`,
        [familyIds],
      );
      const { families, drafts } = rows[0]!;
      if (families || drafts)
        throw new RestoreCheckError(
          `Restored database still holds ${families} deleted families and ${drafts} expired drafts`,
        );
      await openService(pool);
    },
  };
}
