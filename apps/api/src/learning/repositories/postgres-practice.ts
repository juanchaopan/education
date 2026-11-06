import type pg from 'pg';
import type { AssignPractice } from '@education/contracts';

export async function insertAssignment(
  client: pg.PoolClient,
  childId: string,
  { id, version }: AssignPractice,
) {
  await client.query(
    `INSERT INTO assignments(child_id,problem_id,problem_version)
     VALUES($1,$2,$3) ON CONFLICT (child_id,problem_id,problem_version) DO NOTHING`,
    [childId, id, version],
  );
}

export async function readAssignments(
  client: pg.PoolClient,
  childId: string,
  limit: number,
  offset: number,
) {
  const { rows } = await client.query<{ id: string; version: string }>(
    `SELECT problem_id AS id, problem_version AS version FROM assignments
     WHERE child_id=$1 ORDER BY problem_id,problem_version LIMIT $2 OFFSET $3`,
    [childId, limit, offset],
  );
  return rows.map(({ id, version }) => ({ id, version: Number(version) }));
}
