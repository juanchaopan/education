import type pg from 'pg';

// Runs work in one transaction on a connection the caller holds.
export async function inTransaction<T>(client: pg.PoolClient, work: () => Promise<T>) {
  await client.query('BEGIN');
  try {
    const result = await work();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Runs work in one transaction on a connection of its own from the pool.
export async function transaction<T>(pool: pg.Pool, work: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await inTransaction(client, () => work(client));
  } finally {
    client.release();
  }
}
