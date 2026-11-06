import type pg from 'pg';

export async function cleanupExpiredDrafts(pool: pg.Pool) {
  const result = await pool.query('DELETE FROM drafts WHERE expires_at<=statement_timestamp()');
  return result.rowCount ?? 0;
}
