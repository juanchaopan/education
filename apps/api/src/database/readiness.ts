import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type pg from 'pg';

// The database is ready when this release's latest migration is applied and the
// service gate is open. A database missing either table is not ready: the query
// fails, and callers treat a failure as not ready.
export async function createReadinessCheck(pool: pg.Pool) {
  const folder = new URL('../../drizzle/', import.meta.url);
  const journal = JSON.parse(await readFile(new URL('meta/_journal.json', folder), 'utf8')) as {
    entries: { tag: string }[];
  };
  const tag = journal.entries.at(-1)!.tag;
  const hash = createHash('sha256')
    .update(await readFile(new URL(`${tag}.sql`, folder), 'utf8'))
    .digest('hex');
  return async () => {
    const result = await pool.query<{ ready: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=$1)
        AND EXISTS(SELECT 1 FROM service_gate) AS ready`,
      [hash],
    );
    return result.rows[0]?.ready === true;
  };
}
