import pg from 'pg';
import { databaseOptions } from '../apps/api/dist/shared/database-config.js';
import { cleanupVerificationMail } from '../apps/api/dist/database/mail-retention.js';
import { validateSupabaseDatabase } from './staging-release.mjs';

async function cleanup() {
  validateSupabaseDatabase(process.env.DATABASE_URL, process.env.STAGING_SUPABASE_PROJECT_REF);
  const pool = new pg.Pool({
    ...databaseOptions({ ...process.env, STAGING_DATABASE: 'true' }),
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  try {
    console.log(`Expired verification payloads cleared: ${await cleanupVerificationMail(pool)}`);
  } finally {
    await pool.end();
  }
}
try {
  await cleanup();
} catch {
  console.error('Staging mail retention failed; inspect database availability.');
  process.exitCode = 1;
}
