import type pg from 'pg';
import { cleanupExpiredDrafts } from './database/draft-retention.js';
import { openService } from './database/service-gate.js';
import { createDeletionLedger } from './identity/repositories/postgres-deletion-ledger.js';
import { removeFamily } from './identity/repositories/postgres-family-removal.js';
import { transaction } from './identity/repositories/transaction.js';

export class RestoreCheckError extends Error {}

const heldFamilies = async (database: pg.Pool | pg.ClientBase, familyIds: string[]) =>
  (
    await database.query<{ id: string }>('SELECT id FROM families WHERE id = ANY($1::uuid[])', [
      familyIds,
    ])
  ).rows.map(({ id }) => id);

// Clears a restored application database of what must not come back, then
// opens it. The database stays closed throughout: its service gate has no row
// until open() succeeds, and any failure leaves it that way.
export function createRestoredDatabase(pool: pg.Pool, ledgerPool: pg.Pool) {
  const ledger = createDeletionLedger(ledgerPool);
  return {
    // In one transaction, removes every family the backup still holds that the
    // ledger names, finished or not, and revokes every session: a session
    // signed out or revoked after the backup would otherwise be valid again.
    // Then clears the drafts that expired since the backup; drafts expiring
    // later are hidden by every read and cleared by maintenance.
    async replay() {
      const recorded = await ledger.recorded();
      const sessions = await transaction(pool, async (client) => {
        for (const familyId of await heldFamilies(client, recorded))
          await removeFamily(client, familyId);
        const parents = await client.query('DELETE FROM parent_sessions');
        const children = await client.query('DELETE FROM child_sessions');
        return (parents.rowCount ?? 0) + (children.rowCount ?? 0);
      });
      return {
        ledgerEntries: recorded.length,
        sessionsRevoked: sessions,
        expiredDrafts: await cleanupExpiredDrafts(pool),
      };
    },
    // Reads the ledger again, so an entry recorded after the replay is caught,
    // and opens only when the database holds none of its families.
    async open() {
      const left = await heldFamilies(pool, await ledger.recorded());
      if (left.length)
        throw new RestoreCheckError(
          `Restored database still holds ${left.length} deleted families`,
        );
      await openService(pool);
    },
  };
}
