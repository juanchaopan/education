import type pg from 'pg';
import { DraftContent, type SavedDraft } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';

type Slot = { id: string; version: number };
type Row = { revision: string; expires_at: Date; content: unknown };
const matches = 'child_id=$1 AND problem_id=$2 AND problem_version=$3';
const projection = 'id AS revision,expires_at,content';
const key = (child: string, problem: Slot) => [child, problem.id, problem.version];

export function draftsFor(client: pg.PoolClient, child: string) {
  return {
    current: (problem: Slot) => currentDraft(client, child, problem),
    save: async (problem: Slot, content: DraftContent) => {
      const { rows } = await client.query<Row>(
        `INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at)
         VALUES($1,$2,$3,$4,clock_timestamp()+interval '168 hours')
         ON CONFLICT(child_id,problem_id,problem_version) DO UPDATE SET
           id=CASE WHEN drafts.content=excluded.content THEN drafts.id ELSE excluded.id END,
           expires_at=CASE WHEN drafts.content=excluded.content THEN drafts.expires_at ELSE excluded.expires_at END,
           content=excluded.content
         RETURNING ${projection}`,
        [...key(child, problem), content],
      );
      return snapshot(rows[0]!);
    },
    discard: (problem: Slot, revision: string) =>
      deleteDraftRevision(client, child, problem, revision),
  };
}

async function currentDraft(client: pg.PoolClient, child: string, problem: Slot) {
  const params = key(child, problem);
  await lockLearningSlot(client, child, problem);
  await client.query(
    `DELETE FROM drafts WHERE ${matches} AND expires_at<=clock_timestamp()`,
    params,
  );
  const { rows } = await client.query<Row>(
    `SELECT ${projection} FROM drafts WHERE ${matches} AND expires_at>clock_timestamp() FOR UPDATE`,
    params,
  );
  const row = rows[0];
  if (!row) return null;
  if (Value.Check(DraftContent, row.content)) return snapshot(row);
  await deleteDraftRevision(client, child, problem, row.revision);
  return null;
}

export async function lockLearningSlot(client: pg.PoolClient, child: string, problem: Slot) {
  // Drafts and attempts share the lock, including when neither has a row yet.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 33))', [
    JSON.stringify(key(child, problem)),
  ]);
}

function snapshot(row: Row): SavedDraft {
  return {
    revision: row.revision,
    expiresAt: row.expires_at.toISOString(),
    content: row.content as DraftContent,
  };
}

export async function deleteDraftRevision(
  client: pg.PoolClient,
  child: string,
  problem: Slot,
  revision: string,
) {
  const result = await client.query(`DELETE FROM drafts WHERE ${matches} AND id=$4`, [
    ...key(child, problem),
    revision,
  ]);
  return result.rowCount === 1;
}
