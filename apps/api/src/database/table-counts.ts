import type pg from 'pg';
import { serviceGateTable } from './service-gate.js';

// Row counts of every table a backup carries: the application tables and the
// migration history, read in one statement so they share one snapshot. Taken
// inside the backup's snapshot and again after a restore, they show whether
// every row was loaded. The service gate is left out, as backups leave out its
// row.
export async function tableCounts(database: pg.Pool | pg.ClientBase) {
  const { rows: tables } = await database.query<{ name: string; quoted: string }>(
    `SELECT table_schema || '.' || table_name AS name,
            quote_ident(table_schema) || '.' || quote_ident(table_name) AS quoted
     FROM information_schema.tables
     WHERE table_schema IN ('public', 'drizzle') AND table_type = 'BASE TABLE'
       AND table_schema || '.' || table_name <> $1
     ORDER BY 1`,
    [serviceGateTable],
  );
  if (!tables.length) return {};
  const { rows } = await database.query<{ name: string; count: number }>(
    tables
      .map(
        ({ quoted }, index) => `SELECT $${index + 1}::text AS name, count(*)::int FROM ${quoted}`,
      )
      .join(' UNION ALL '),
    tables.map(({ name }) => name),
  );
  return Object.fromEntries(rows.map(({ name, count }) => [name, count]));
}
