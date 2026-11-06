import pg from 'pg';
import { databaseOptions } from '../apps/api/dist/shared/database-config.js';
import { cleanupAccountMail } from '../apps/api/dist/database/mail-retention.js';
import { cleanupExpiredDrafts } from '../apps/api/dist/database/draft-retention.js';
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
    const results = await Promise.allSettled([
      cleanupAccountMail(pool),
      cleanupExpiredDrafts(pool),
    ]);
    for (const [index, label] of [
      'Account mail records cleared',
      'Expired drafts cleared',
    ].entries()) {
      const result = results[index];
      if (result.status === 'fulfilled') console.log(`${label}: ${result.value}`);
      else {
        console.error(`${label}: cleanup failed`);
        process.exitCode = 1;
      }
    }
  } finally {
    await pool.end();
  }
}
try {
  await cleanup();
} catch {
  console.error('Staging retention failed; inspect database availability.');
  process.exitCode = 1;
}
