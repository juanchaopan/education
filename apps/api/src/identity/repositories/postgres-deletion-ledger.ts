import type pg from 'pg';

// What family deletion needs from the ledger.
export type DeletionLedger = {
  record(familyId: string): Promise<void>;
  complete(familyId: string): Promise<void>;
  pending(limit: number): Promise<string[]>;
};

// What restoring a backup and ledger maintenance need from it.
export type LedgerHistory = {
  recorded(): Promise<string[]>;
  prune(retentionDays: number): Promise<number>;
};

// The ledger database holds one row per deleted family, in acceptance order.
// Recording twice keeps the first entry; completing twice keeps the first time.
export function createDeletionLedger(pool: pg.Pool): DeletionLedger & LedgerHistory {
  return {
    async record(familyId) {
      await pool.query(
        'INSERT INTO family_deletions(family_id) VALUES($1) ON CONFLICT (family_id) DO NOTHING',
        [familyId],
      );
    },
    async complete(familyId) {
      await pool.query(
        `UPDATE family_deletions SET completed_at=clock_timestamp()
         WHERE family_id=$1 AND completed_at IS NULL`,
        [familyId],
      );
    },
    async pending(limit) {
      const { rows } = await pool.query<{ familyId: string }>(
        `SELECT family_id AS "familyId" FROM family_deletions
         WHERE completed_at IS NULL ORDER BY sequence LIMIT $1`,
        [limit],
      );
      return rows.map(({ familyId }) => familyId);
    },
    // Every family the ledger holds, finished or not: a restored backup can
    // predate deletions that were completed long ago.
    async recorded() {
      const { rows } = await pool.query<{ familyId: string }>(
        'SELECT family_id AS "familyId" FROM family_deletions ORDER BY sequence',
      );
      return rows.map(({ familyId }) => familyId);
    },
    // An entry is needed only while a backup that still holds its family can be
    // restored. Pending entries stay until their deletion is finished.
    async prune(retentionDays) {
      const result = await pool.query(
        `DELETE FROM family_deletions
         WHERE completed_at < clock_timestamp() - make_interval(days => $1)`,
        [retentionDays],
      );
      return result.rowCount ?? 0;
    },
  };
}
