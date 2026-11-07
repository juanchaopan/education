import pg from 'pg';
import { createFamilyDeletion } from './family-deletion-application.js';
import {
  applicationDatabase,
  databaseOptions,
  deletionLedgerDatabase,
  type DatabaseSource,
} from './shared/database-config.js';

// Maintenance entry point that finishes family deletions the ledger still
// records as pending. It runs on a schedule next to the other retention jobs,
// with a longer statement timeout than requests get, and prints only counts.
const open = (source: DatabaseSource) =>
  new pg.Pool({
    ...databaseOptions(process.env, source),
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
  });

const pool = open(applicationDatabase);
const ledgerPool = open(deletionLedgerDatabase);
try {
  const { completed, failed } = await createFamilyDeletion(pool, ledgerPool)!.completePending();
  console.log(`Pending family deletions completed: ${completed}, failed: ${failed}`);
  if (failed) process.exitCode = 1;
} catch {
  console.error('Pending family deletions could not be read; inspect database availability.');
  process.exitCode = 1;
} finally {
  await Promise.all([pool.end(), ledgerPool.end()]);
}
