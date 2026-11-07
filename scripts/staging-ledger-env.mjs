import {
  databaseOptions,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';
import { validateSupabaseDatabase } from './staging-release.mjs';

function inApplicationProject(connection, ref) {
  try {
    validateSupabaseDatabase(connection, ref);
    return true;
  } catch {
    return false;
  }
}

// The deletion ledger is optional on staging: without it the API offers no
// family deletion. When it is configured it must pass the same hosted TLS and
// pooling rules as the application database and live outside the application's
// Supabase project, however its address is written, so the project's backups
// never hold it.
export function stagingLedgerEnv(env) {
  if (!env.DELETION_LEDGER_URL) return {};
  databaseOptions({ ...env, STAGING_DATABASE: 'true' }, deletionLedgerDatabase);
  if (inApplicationProject(env.DELETION_LEDGER_URL, env.STAGING_SUPABASE_PROJECT_REF))
    throw new Error('The deletion ledger must live outside the application Supabase project');
  return {
    DELETION_LEDGER_URL: env.DELETION_LEDGER_URL,
    DELETION_LEDGER_CA_CERT: env.DELETION_LEDGER_CA_CERT ?? '',
  };
}
