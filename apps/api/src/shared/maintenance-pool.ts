import pg from 'pg';
import { applicationDatabase, databaseOptions, type DatabaseSource } from './database-config.js';

// A single connection with a longer statement timeout than requests get, for
// migrations, release preparation and scheduled maintenance.
export function maintenancePool(
  env: NodeJS.ProcessEnv,
  source: DatabaseSource = applicationDatabase,
  statementTimeout = 30000,
) {
  return new pg.Pool({
    ...databaseOptions(env, source),
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: statementTimeout,
  });
}
