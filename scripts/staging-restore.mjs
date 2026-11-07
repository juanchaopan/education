import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupRetentionDays } from '../apps/api/dist/shared/backup-retention.js';
import {
  applicationDatabase,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { createReadinessCheck } from '../apps/api/dist/database/readiness.js';
import { closeService } from '../apps/api/dist/database/service-gate.js';
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
import { migrateStaging } from './staging-migrate.mjs';
import { libpqConnection, postgresTool } from './staging-postgres-tools.mjs';

const missingTable = '42P01';

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

// From the moment the service gate closes, any failure leaves the service
// closed: the gate opens only after every row is loaded, every family in the
// deletion ledger is removed again, the schema is migrated to this release and
// the result is checked.
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
  await run('rows', async () => checkCounts(manifest.counts, await tableCounts(pool)));
  const replayed = await run('replay', () => restored.replay());
  // Migrating a backup older than the service gate creates the gate open;
  // it is closed again so that only the check below opens the service.
  await run('migrate', async () => {
    await migrateStaging(hosted, [pool, ledgerPool]);
    await closeService(pool);
  });
  await run('open', async () => {
    await restored.open();
    if (await (await createReadinessCheck(pool))()) return;
    await closeService(pool);
    throw new Error('Restored database is not ready for this release');
  });
  return replayed;
}

// Restores a decrypted backup folder into the staging application database.
async function restore(folder, scratch, progress) {
  const { manifest, ageHours } = await checkedBackup(folder);
  const databases = stagingDatabases(process.env);
  if (!databases.ledger) throw new Error('Restoring needs the deletion ledger');
  const { hosted } = databases;
  const connection = await libpqConnection(hosted, applicationDatabase, scratch);
  const pool = maintenancePool(hosted, applicationDatabase, 120000);
  const ledgerPool = maintenancePool(hosted, deletionLedgerDatabase);
  const { timings, run } = stages();
  try {
    await run('close', () =>
      closeService(pool).catch((error) => {
        if (error.code !== missingTable) throw error;
      }),
    );
    progress.closed = true;
    const replayed = await restoreClosed({
      hosted,
      pool,
      ledgerPool,
      connection,
      folder,
      manifest,
      run,
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
const progress = { closed: false };
try {
  await restore(process.argv[2], scratch, progress);
} catch (error) {
  const state = progress.closed ? 'the service stays closed' : 'nothing was changed';
  console.error(`Staging restore failed, ${state}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
