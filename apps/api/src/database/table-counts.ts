import type pg from 'pg';
import { serviceGateTable } from './service-gate.js';

const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;

// Row counts of every table a backup carries: the application tables and the
// migration history. Taken inside the backup's snapshot and again after a
// restore, they show whether every row was loaded. The service gate is left
// out, as backups leave out its row.
export async function tableCounts(database: pg.Pool | pg.ClientBase) {
  const { rows } = await database.query<{ name: string; schema: string; table: string }>(
    `SELECT table_schema || '.' || table_name AS name, table_schema AS schema, table_name AS table
     FROM information_schema.tables
     WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
       AND table_schema || '.' || table_name <> $1
     ORDER BY 1`,
    [serviceGateTable],
  );
  const counts: Record<string, number> = {};
  for (const { name, schema, table } of rows) {
    const result = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${quoted(schema)}.${quoted(table)}`,
    );
    counts[name] = result.rows[0]!.count;
  }
  return counts;
}
