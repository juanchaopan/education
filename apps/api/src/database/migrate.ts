import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { databaseOptions } from '../shared/database-config.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for migrations');
const pool = new pg.Pool({
  ...databaseOptions(process.env),
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});
try {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
} finally {
  await pool.end();
}
