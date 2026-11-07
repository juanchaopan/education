import type pg from 'pg';

export type DeletionLedger = {
  record(familyId: string): Promise<void>;
  complete(familyId: string): Promise<void>;
  pending(limit: number): Promise<string[]>;
};

// The ledger database holds one row per deleted family, in acceptance order.
// Recording twice keeps the first entry; completing twice keeps the first time.
export function createDeletionLedger(pool: pg.Pool): DeletionLedger {
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
  };
}
