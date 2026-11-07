import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type pg from 'pg';
import { serviceGateTable } from './service-gate.js';

async function latestMigrationHash() {
  const folder = new URL('../../drizzle/', import.meta.url);
  const journal = JSON.parse(await readFile(new URL('meta/_journal.json', folder), 'utf8')) as {
    entries: { tag: string }[];
  };
  const tag = journal.entries.at(-1)!.tag;
  return createHash('sha256')
    .update(await readFile(new URL(`${tag}.sql`, folder), 'utf8'))
    .digest('hex');
}

const migrated = 'EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=$1)';

async function check(pool: pg.Pool, condition: string) {
  const hash = await latestMigrationHash();
  return async () => {
    const result = await pool.query<{ ready: boolean }>(`SELECT ${condition} AS ready`, [hash]);
    return result.rows[0]?.ready === true;
  };
}

// Whether this release's latest migration is applied.
export const createMigrationCheck = (pool: pg.Pool) => check(pool, migrated);

// The database is ready when this release's latest migration is applied and the
// service gate is open. A database missing either table is not ready: the query
// fails, and callers treat a failure as not ready.
export const createReadinessCheck = (pool: pg.Pool) =>
  check(pool, `${migrated} AND EXISTS(SELECT 1 FROM ${serviceGateTable})`);
