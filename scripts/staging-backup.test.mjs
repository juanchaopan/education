import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { backupRetentionDays } from '../apps/api/dist/shared/backup-retention.js';
import {
  applicationDatabase,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';
import { checkBackup, checkCounts, fileChecksum } from './staging-backup-manifest.mjs';
import { libpqConnection } from './staging-postgres-tools.mjs';

const now = new Date('2026-11-07T12:00:00Z');
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const manifest = (createdAt, environment = 'staging') => ({
  environment,
  host: 'ep-application.c-2.ap-southeast-1.aws.neon.tech',
  createdAt,
  sha256: 'a'.repeat(64),
  counts: { 'public.families': 2 },
});
const check = (backup, sha256 = 'a'.repeat(64)) =>
  checkBackup(backup, { environment: 'staging', sha256, now, retentionDays: backupRetentionDays });

async function withFolder(work) {
  const folder = await mkdtemp(join(tmpdir(), 'backup-test-'));
  try {
    await work(folder);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test('accepts a staging backup within retention and reports its age', () => {
  assert.deepEqual(check(manifest(hoursAgo(6.04))), { ageHours: 6 });
  assert.deepEqual(check(manifest(hoursAgo(backupRetentionDays * 24))), {
    ageHours: backupRetentionDays * 24,
  });
});

test('refuses a backup of another environment, a changed dump, or one past retention', () => {
  assert.throws(() => check(manifest(hoursAgo(1), 'production')), /belongs to production/);
  assert.throws(() => check(manifest(hoursAgo(1)), 'b'.repeat(64)), /checksum/);
  assert.throws(() => check(manifest(hoursAgo(backupRetentionDays * 24 + 1))), /retention/);
  assert.throws(() => check(manifest(hoursAgo(-1))), /future/);
  assert.throws(() => check(manifest('unknown')), /missing/);
});

test('names every table whose restored rows differ from the backup', () => {
  const expected = { 'public.families': 2, 'public.parents': 2 };
  assert.doesNotThrow(() => checkCounts(expected, { ...expected }));
  assert.throws(
    () => checkCounts(expected, { 'public.families': 1, 'public.extra': 0 }),
    /public\.extra, public\.families, public\.parents$/,
  );
});

test('checksums the dump file it is given', () =>
  withFolder(async (folder) => {
    await writeFile(join(folder, 'dump'), 'backup');
    assert.equal(
      await fileChecksum(join(folder, 'dump')),
      createHash('sha256').update('backup').digest('hex'),
    );
  }));

test('hands client tools the address without its password and with verified TLS', () =>
  withFolder(async (folder) => {
    const hosted = 'postgres://app:p%40ss@ep-application.example:5432/neondb?sslmode=verify-full';
    const system = await libpqConnection({ DATABASE_URL: hosted }, applicationDatabase, folder);
    assert.equal(system.env.PGPASSWORD, 'p@ss');
    assert.doesNotMatch(system.dbname, /p%40ss|p@ss/);
    assert.equal(new URL(system.dbname).searchParams.get('sslrootcert'), 'system');

    const pinned = await libpqConnection(
      { DELETION_LEDGER_URL: hosted, DELETION_LEDGER_CA_CERT: 'PEM' },
      deletionLedgerDatabase,
      folder,
    );
    const path = new URL(pinned.dbname).searchParams.get('sslrootcert');
    assert.equal(await readFile(path, 'utf8'), 'PEM');

    const local = await libpqConnection(
      { DATABASE_URL: 'postgres://app:local@127.0.0.1:5432/education' },
      applicationDatabase,
      folder,
    );
    assert.equal(new URL(local.dbname).searchParams.has('sslrootcert'), false);
  }));

test('keeps backup artifacts exactly as long as a backup may be restored', async () => {
  const workflow = await readFile('.github/workflows/staging-backup.yml', 'utf8');
  assert.deepEqual(
    [...workflow.matchAll(/retention-days: (\d+)/g)].map((match) => Number(match[1])),
    [backupRetentionDays],
  );
});
