import {
  applicationDatabase,
  databaseOptions,
  deletionLedgerDatabase,
} from '../apps/api/dist/shared/database-config.js';

// The variables a database is reached by, as the staging runtime receives them.
const variables = (env, source) => ({
  [source.url]: env[source.url],
  [source.ca]: env[source.ca] ?? '',
});

// Checks a database under the hosted rules (verified TLS, no transaction
// pooling, no other connection options) and returns the host it leads to.
function hostOf(hosted, source) {
  databaseOptions(hosted, source);
  return new URL(hosted[source.url]).hostname.toLowerCase();
}

// The application database must be the one the maintainer named for staging
// in STAGING_DATABASE_HOST. The deletion ledger is optional: without it the API
// offers no family deletion. When it is configured it must sit on another host,
// so the application database's provider project and its backups never hold
// it. Staging steps and the processes they start run with the returned hosted
// environment, which always applies the hosted rules.
export function stagingDatabases(env) {
  const hosted = { ...env, STAGING_DATABASE: 'true' };
  const expected = env.STAGING_DATABASE_HOST?.trim().toLowerCase();
  if (!expected) throw new Error('Missing staging configuration: STAGING_DATABASE_HOST');
  const application = hostOf(hosted, applicationDatabase);
  if (application !== expected)
    throw new Error('DATABASE_URL must use the host named by STAGING_DATABASE_HOST');
  const ledger = Boolean(env.DELETION_LEDGER_URL);
  if (ledger && hostOf(hosted, deletionLedgerDatabase) === application)
    throw new Error('The deletion ledger must use a different host from the application database');
  return {
    hosted,
    ledger,
    runtimeEnv: {
      ...variables(env, applicationDatabase),
      ...(ledger ? variables(env, deletionLedgerDatabase) : {}),
    },
  };
}
