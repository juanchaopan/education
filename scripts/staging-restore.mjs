import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupRetentionDays } from '../apps/api/dist/shared/backup-retention.js';
import {
  applicationDatabase,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { createMigrationCheck } from '../apps/api/dist/database/readiness.js';
import { closeService, serviceOpen } from '../apps/api/dist/database/service-gate.js';
import { tableCounts } from '../apps/api/dist/database/table-counts.js';
import { createRestoredDatabase } from '../apps/api/dist/restore-application.js';
import {
  checkBackup,
  checkCounts,
  dumpFile,
  fileChecksum,
  manifestFile,
} from './staging-backup-manifest.mjs';
import { stagingDatabases } from './staging-database-env.mjs';
import { withStagingDatabaseLock } from './staging-database-lock.mjs';
import { migrateStaging } from './staging-migrate.mjs';
import { libpqConnection, postgresTool } from './staging-postgres-tools.mjs';

const missingTable = '42P01';

class ServiceStaysClosed extends Error {}

// The backup is checked before anything changes: its environment, checksum
// and age.
async function checkedBackup(folder) {
  const manifest = JSON.parse(await readFile(join(folder, manifestFile), 'utf8'));
  const { ageHours } = checkBackup(manifest, {
    environment: 'staging',
    sha256: await fileChecksum(join(folder, dumpFile)),
    now: new Date(),
    retentionDays: backupRetentionDays,
  });
  return { manifest, ageHours };
}

function stages() {
  const timings = {};
  return {
    timings,
    async run(name, work) {
      const started = performance.now();
      const result = await work();
      timings[name] = Math.round(performance.now() - started);
      return result;
    },
  };
}

// Runs with the service gate closed. Every backup carries the gate table
// without its row and migrations never touch it, so only the last step opens
// the service: after every row is loaded, the schema is migrated to this
// release, every family in the deletion ledger is removed again under that
// schema, and the ledger, read again, names no family the database holds.
async function restoreClosed({ hosted, pool, ledgerPool, connection, folder, manifest, run }) {
  const restored = createRestoredDatabase(pool, ledgerPool);
  await run('clear', () =>
    pool.query(
      'DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public',
    ),
  );
  const options = ['--single-transaction', '--exit-on-error', '--no-owner', '--no-privileges'];
  await run('load', () =>
    postgresTool('pg_restore', connection, [...options, join(folder, dumpFile)]),
  );
  await run('rows', async () => {
    if (await serviceOpen(pool)) throw new Error('Restored database came with an open gate');
    checkCounts(manifest.counts, await tableCounts(pool));
  });
  await run('migrate', async () => {
    await migrateStaging(hosted, [pool, ledgerPool]);
    if (!(await (await createMigrationCheck(pool))()))
      throw new Error('Restored database is not migrated to this release');
  });
  const replayed = await run('replay', () => restored.replay());
  await run('open', () => restored.open());
  return replayed;
}

// Restores a decrypted backup folder into the staging application database.
async function restore(folder, scratch) {
  const { manifest, ageHours } = await checkedBackup(folder);
  const databases = stagingDatabases(process.env);
  if (!databases.ledger) throw new Error('Restoring needs the deletion ledger');
  const { hosted } = databases;
  const connection = await libpqConnection(hosted, applicationDatabase, scratch);
  const pool = maintenancePool(hosted, applicationDatabase, 120000);
  const ledgerPool = maintenancePool(hosted, deletionLedgerDatabase);
  const { timings, run } = stages();
  try {
    const replayed = await withStagingDatabaseLock(hosted, async () => {
      await run('close', () =>
        closeService(pool).catch((error) => {
          if (error.code !== missingTable) throw error;
        }),
      );
      return restoreClosed({ hosted, pool, ledgerPool, connection, folder, manifest, run }).catch(
        (error) => {
          throw new ServiceStaysClosed(error.message, { cause: error });
        },
      );
    });
    const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
    console.log(
      JSON.stringify({ backupTakenAt: manifest.createdAt, ageHours, replayed, timings, total }),
    );
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `Restored the backup taken at ${manifest.createdAt} (${ageHours} h old) in ${total} ms.\n`,
      );
  } finally {
    await Promise.all([pool.end(), ledgerPool.end()]);
  }
}

const scratch = await mkdtemp(join(tmpdir(), 'staging-restore-'));
try {
  await restore(process.argv[2], scratch);
} catch (error) {
  const state =
    error instanceof ServiceStaysClosed ? 'the service stays closed' : 'nothing was changed';
  console.error(`Staging restore failed, ${state}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
