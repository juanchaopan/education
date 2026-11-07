import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import {
  applicationDatabase,
  databaseOptions,
  deletionLedgerDatabase,
  type DatabaseSource,
} from '../shared/database-config.js';

async function migrateDatabase(source: DatabaseSource, folder: string) {
  const pool = new pg.Pool({
    ...databaseOptions(process.env, source),
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
  });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL(`../../${folder}`, import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}

await migrateDatabase(applicationDatabase, 'drizzle');
// The deletion ledger is optional: without it family deletion stays unavailable.
if (process.env[deletionLedgerDatabase.url])
  await migrateDatabase(deletionLedgerDatabase, 'drizzle-ledger');
