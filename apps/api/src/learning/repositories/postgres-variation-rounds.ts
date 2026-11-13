import type pg from 'pg';
import type { VariationRound } from '../domain/variation.js';

const sameRound = (alias: string) =>
  `${alias}.child_id=$1 AND ${alias}.problem_id=r.problem_id
  AND ${alias}.problem_version=r.problem_version AND ${alias}.round=r.round`;

// Every variation round a child has a record of, by problem and round: the
// guess, the first and the last judged reason, how much help was taken, and
// the first and last time anything was recorded.
export async function readVariationRounds(
  client: pg.PoolClient,
  childId: string,
): Promise<VariationRound[]> {
  const { rows } = await client.query<
    Omit<VariationRound, 'version' | 'help'> & { version: string; help: string }
  >(
    `WITH events AS (
      SELECT problem_id,problem_version,round,submitted_at AS at FROM variation_answers WHERE child_id=$1
      UNION ALL
      SELECT problem_id,problem_version,round,requested_at FROM variation_help WHERE child_id=$1
    ), rounds AS (
      SELECT problem_id,problem_version,round,min(at) AS started_at,max(at) AS updated_at
      FROM events GROUP BY problem_id,problem_version,round
    )
    SELECT r.problem_id AS id,r.problem_version AS version,
      r.started_at AS "startedAt",r.updated_at AS "updatedAt",
      (SELECT outcome FROM variation_answers a WHERE ${sameRound('a')} AND a.part='guess') AS guess,
      (SELECT outcome FROM variation_answers a WHERE ${sameRound('a')} AND a.part='reason'
        ORDER BY a.submitted_at LIMIT 1) AS "firstReason",
      (SELECT outcome FROM variation_answers a WHERE ${sameRound('a')} AND a.part='reason'
        ORDER BY a.submitted_at DESC LIMIT 1) AS "lastReason",
      (SELECT count(*) FROM variation_help h WHERE ${sameRound('h')}) AS help
    FROM rounds r
    ORDER BY r.problem_id,r.problem_version,r.started_at`,
    [childId],
  );
  return rows.map((row) => ({ ...row, version: Number(row.version), help: Number(row.help) }));
}
