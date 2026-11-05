import type pg from 'pg';
import { RequestError } from '../../shared/request-error.js';
export async function reserveMailBudget(
  client: pg.PoolClient,
  parent: string,
  kind: 'verification' | 'recovery',
) {
  await client.query('SELECT pg_advisory_xact_lock(1721, 0)');
  const count = (
    await client.query<{ own: number; total: number; recent: number; cooling: boolean }>(
      `
    WITH attempts AS (
      SELECT parent_id,attempted_at,'verification' AS kind FROM verification_attempts
      UNION ALL SELECT parent_id,attempted_at,'recovery' AS kind FROM recovery_attempts
    ) SELECT count(*) FILTER (WHERE parent_id=$1 AND kind=$2)::int AS own, count(*)::int AS total,
      count(*) FILTER (WHERE attempted_at > now()-interval '15 minutes')::int AS recent,
      coalesce(bool_or(parent_id=$1 AND kind=$2 AND attempted_at > now()-interval '60 seconds'),false) AS cooling
    FROM attempts WHERE attempted_at>now()-interval '24 hours'`,
      [parent, kind],
    )
  ).rows[0]!;
  if (count.own >= 5 || count.total >= 50 || count.recent >= 10 || count.cooling)
    throw new RequestError(429, '发送较频繁，请至少等 60 秒再试；达到每日上限时，请明天再来。');
  const table = kind === 'verification' ? 'verification_attempts' : 'recovery_attempts';
  await client.query(`INSERT INTO ${table}(parent_id) VALUES($1)`, [parent]);
}
