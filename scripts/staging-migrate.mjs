import { execFileSync } from 'node:child_process';
import { hardenStagingTables, revokeStagingDefaults } from '../apps/api/dist/database/staging.js';

// The migration covers every configured database; each one's tables are then
// closed to the hosted data API roles. Release and restore both run it.
export async function migrateStaging(hosted, pools) {
  await Promise.all(pools.map(revokeStagingDefaults));
  try {
    execFileSync(process.execPath, ['apps/api/dist/database/migrate.js'], {
      stdio: 'pipe',
      timeout: 60000,
      env: hosted,
    });
  } catch {
    throw new Error('Controlled staging migration failed');
  }
  await Promise.all(pools.map((pool) => hardenStagingTables(pool)));
}
