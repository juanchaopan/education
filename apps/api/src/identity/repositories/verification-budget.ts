import type pg from 'pg';
import { RequestError } from '../../shared/request-error.js';

export async function reserveVerificationBudget(client: pg.PoolClient, parent: string) {
  await client.query('SELECT pg_advisory_xact_lock(1721, 0)');
  await client.query(
    "DELETE FROM verification_attempts WHERE attempted_at < now() - interval '24 hours'",
  );
  const count = (
    await client.query<{ own: number; total: number; recent: number; cooling: boolean }>(
      `
    SELECT count(*) FILTER (WHERE parent_id=$1)::int AS own, count(*)::int AS total,
      count(*) FILTER (WHERE attempted_at > now()-interval '15 minutes')::int AS recent,
      coalesce(bool_or(parent_id=$1 AND attempted_at > now()-interval '60 seconds'),false) AS cooling
    FROM verification_attempts`,
      [parent],
    )
  ).rows[0]!;
  if (count.own >= 5 || count.total >= 50 || count.recent >= 10 || count.cooling)
    throw new RequestError(429, '发送较频繁，请至少等 60 秒再试；达到每日上限时，请明天再来。');
  await client.query('INSERT INTO verification_attempts(parent_id) VALUES($1)', [parent]);
}

export async function verificationTransaction<T>(
  pool: pg.Pool,
  work: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
