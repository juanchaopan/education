import type pg from 'pg';

type Database = pg.Pool | pg.ClientBase;

// The service gate is one row in this table: the API answers only while it is
// there. Backups leave the row out. Closing removes the row; opening twice
// keeps the first opening time.
export const serviceGateTable = 'public.service_gate';

export async function closeService(database: Database) {
  await database.query(`DELETE FROM ${serviceGateTable}`);
}

export async function openService(database: Database) {
  await database.query(`INSERT INTO ${serviceGateTable} DEFAULT VALUES ON CONFLICT DO NOTHING`);
}

export async function serviceOpen(database: Database) {
  const { rows } = await database.query<{ open: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${serviceGateTable}) AS open`,
  );
  return rows[0]!.open;
}
