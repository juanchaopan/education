import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applicationDatabase } from '../apps/api/dist/shared/database-config.js';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { serviceGateTable, serviceOpen } from '../apps/api/dist/database/service-gate.js';
import { tableCounts } from '../apps/api/dist/database/table-counts.js';
import { dumpFile, fileChecksum, manifestFile } from './staging-backup-manifest.mjs';
import { stagingDatabases } from './staging-database-env.mjs';
import { withStagingDatabaseLock } from './staging-database-lock.mjs';
import { libpqConnection, postgresTool } from './staging-postgres-tools.mjs';

// Dumps the staging application database into a folder with its manifest. The
// row counts and the dump read one exported snapshot, so they describe the
// same data. A closed database is not backed up: it is being restored, or its
// restore was not checked. The dump leaves out the service gate's row, so a
// restored copy starts closed.
async function dump(hosted, folder, connection) {
  const pool = maintenancePool(hosted);
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (!(await serviceOpen(client))) throw new Error('The service is closed; no backup taken');
    const { rows } = await client.query(
      'SELECT pg_export_snapshot() AS snapshot, clock_timestamp() AS "createdAt"',
    );
    const counts = await tableCounts(client);
    await postgresTool('pg_dump', connection, [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      `--snapshot=${rows[0].snapshot}`,
      `--exclude-table-data=${serviceGateTable}`,
      `--file=${join(folder, dumpFile)}`,
    ]);
    await client.query('COMMIT');
    return { createdAt: rows[0].createdAt.toISOString(), counts };
  } finally {
    client.release();
    await pool.end();
  }
}

async function backup(folder, scratch) {
  const { hosted } = stagingDatabases(process.env);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const connection = await libpqConnection(hosted, applicationDatabase, scratch);
  const { createdAt, counts } = await withStagingDatabaseLock(hosted, () =>
    dump(hosted, folder, connection),
  );
  const manifest = {
    environment: 'staging',
    host: process.env.STAGING_DATABASE_HOST.trim().toLowerCase(),
    createdAt,
    sha256: await fileChecksum(join(folder, dumpFile)),
    counts,
  };
  await writeFile(join(folder, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`Backup taken at ${createdAt}: ${total} rows`);
}

const scratch = await mkdtemp(join(tmpdir(), 'staging-backup-'));
try {
  await backup(process.argv[2], scratch);
} catch (error) {
  console.error(`Staging backup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
