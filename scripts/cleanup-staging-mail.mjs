import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { cleanupAccountMail } from '../apps/api/dist/database/mail-retention.js';
import { cleanupExpiredDrafts } from '../apps/api/dist/database/draft-retention.js';
import { stagingDatabases } from './staging-database-env.mjs';
import { withStagingDatabaseLock } from './staging-database-lock.mjs';

const run = promisify(execFile);

function report(label, outcome) {
  if (outcome.status === 'fulfilled') return console.log(`${label}: ${outcome.value}`);
  console.error(`${label}: cleanup failed`);
  process.exitCode = 1;
}

// The API's own maintenance command finishes pending family deletions. It
// prints its counts, which are kept when it fails because a family could not
// be removed.
async function completeDeletions(hosted) {
  try {
    const { stdout } = await run(process.execPath, ['apps/api/dist/complete-deletions.js'], {
      timeout: 120000,
      env: hosted,
    });
    console.log(stdout.trim());
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    console.error(output || 'Pending family deletions could not be finished.');
    process.exitCode = 1;
  }
}

async function cleanup({ hosted, ledger }) {
  const pool = maintenancePool(hosted, undefined, 10000);
  try {
    const [mail, drafts] = await Promise.allSettled([
      cleanupAccountMail(pool),
      cleanupExpiredDrafts(pool),
    ]);
    report('Account mail records cleared', mail);
    report('Expired drafts cleared', drafts);
  } finally {
    await pool.end();
  }
  // Deletions run after the other cleanups, which touch the same families' rows.
  if (ledger) await completeDeletions(hosted);
}

function configuredDatabases() {
  try {
    return stagingDatabases(process.env);
  } catch (error) {
    console.error(`Staging database configuration rejected: ${error.message}`);
    process.exit(1);
  }
}

const databases = configuredDatabases();
try {
  await withStagingDatabaseLock(databases.hosted, () => cleanup(databases));
} catch {
  console.error('Staging retention failed; inspect database availability.');
  process.exitCode = 1;
}
