import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

// A backup is a database dump and a manifest, packed and encrypted together.
// The manifest names the environment the dump came from, its source host, when
// its snapshot was taken, the dump's checksum and the row count of every table
// in that snapshot, so a restore can refuse the wrong backup and prove every
// row was loaded.
export const dumpFile = 'application.dump';
export const manifestFile = 'manifest.json';

export async function fileChecksum(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

const day = 24 * 60 * 60 * 1000;

// The source host is recorded but not compared: after losing a database
// project, a backup is restored into its replacement on another host.
export function checkBackup(manifest, { environment, sha256, now, retentionDays }) {
  if (manifest.environment !== environment)
    throw new Error(`Backup belongs to ${manifest.environment}, not ${environment}`);
  if (manifest.sha256 !== sha256) throw new Error('Backup dump does not match its checksum');
  const age = now.getTime() - Date.parse(manifest.createdAt);
  if (!(age >= 0)) throw new Error('Backup time is missing or in the future');
  if (age > retentionDays * day)
    throw new Error(`Backup is older than the ${retentionDays}-day retention`);
  return { ageHours: Math.round((age / (60 * 60 * 1000)) * 10) / 10 };
}

export function checkCounts(expected, actual) {
  const tables = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  const differing = tables.filter((table) => expected[table] !== actual[table]);
  if (differing.length)
    throw new Error(`Restored rows differ from the backup in ${differing.join(', ')}`);
}
