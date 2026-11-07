import { createFamilyDeletion } from './family-deletion-application.js';
import { deletionLedgerDatabase } from './shared/database-config.js';
import { maintenancePool } from './shared/maintenance-pool.js';

// Maintenance entry point that finishes family deletions the ledger still
// records as pending. It runs on a schedule next to the other retention jobs,
// with a longer statement timeout than requests get, and prints only counts.
const pool = maintenancePool(process.env);
const ledgerPool = maintenancePool(process.env, deletionLedgerDatabase);
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
