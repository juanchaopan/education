import {
  applicationDatabase,
  databaseOptions,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';

// Checks a database under the hosted rules (verified TLS, no transaction
// pooling, no other connection options) and returns the host it leads to.
function hostedHost(env, source) {
  databaseOptions({ ...env, STAGING_DATABASE: 'true' }, source);
  return new URL(env[source.url]).hostname.toLowerCase();
}

// The application database must be the one the maintainer named for staging
// in STAGING_DATABASE_HOST. The deletion ledger is optional: without it the API
// offers no family deletion. When it is configured it must sit on another host,
// so the application database's provider project and its backups never hold
// it. Returns the database variables the staging runtime receives.
export function stagingDatabaseEnv(env) {
  const expected = env.STAGING_DATABASE_HOST?.trim().toLowerCase();
  if (!expected) throw new Error('Missing staging configuration: STAGING_DATABASE_HOST');
  const application = hostedHost(env, applicationDatabase);
  if (application !== expected)
    throw new Error('DATABASE_URL must use the host named by STAGING_DATABASE_HOST');
  const databases = {
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_CA_CERT: env.DATABASE_CA_CERT ?? '',
  };
  if (!env.DELETION_LEDGER_URL) return databases;
  if (hostedHost(env, deletionLedgerDatabase) === application)
    throw new Error('The deletion ledger must use a different host from the application database');
  return {
    ...databases,
    DELETION_LEDGER_URL: env.DELETION_LEDGER_URL,
    DELETION_LEDGER_CA_CERT: env.DELETION_LEDGER_CA_CERT ?? '',
  };
}
