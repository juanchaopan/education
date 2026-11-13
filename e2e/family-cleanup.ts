import type pg from 'pg';

// Removes test families the way the app removes a family: the parent rows
// first, then the family, the lock order every parent request uses. A page
// still open on the family may be in the middle of a parent request, and
// deleting the family row first would deadlock with it.
export async function removeFamilies(pool: pg.Pool, families: readonly string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM parents WHERE family_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [families],
    );
    await client.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
