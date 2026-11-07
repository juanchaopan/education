import type pg from 'pg';

type Database = pg.Pool | pg.ClientBase;

// The service gate is one row in service_gate: the API answers only while it is
// there. Closing removes the row; opening twice keeps the first opening time.
export async function closeService(database: Database) {
  await database.query('DELETE FROM service_gate');
}

export async function openService(database: Database) {
  await database.query('INSERT INTO service_gate DEFAULT VALUES ON CONFLICT DO NOTHING');
}
