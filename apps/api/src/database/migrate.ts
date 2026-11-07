import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import {
  applicationDatabase,
  deletionLedgerDatabase,
  type DatabaseSource,
} from '../shared/database-config.js';
import { maintenancePool } from '../shared/maintenance-pool.js';

async function migrateDatabase(source: DatabaseSource, folder: string) {
  const pool = maintenancePool(process.env, source);
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
