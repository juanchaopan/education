import pg from 'pg';
import { applicationDatabase, databaseOptions } from '../apps/api/dist/shared/database-config.js';

// Release, backup, restore and hourly maintenance change or read the whole
// staging application database, so they run one at a time: each holds this
// session-level advisory lock on that database for its whole run, waiting up to
// ten minutes for it. The lock outlives a restore replacing the schemas, and
// ends with its session if the runner dies.
export async function withStagingDatabaseLock(hosted, work) {
  const client = new pg.Client({
    ...databaseOptions(hosted, applicationDatabase),
    connectionTimeoutMillis: 10000,
    statement_timeout: 600000,
  });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(4545, 0)');
    return await work();
  } finally {
    await client.end();
  }
}
