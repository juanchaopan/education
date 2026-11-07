import type pg from 'pg';

// Which environment variables hold a database's connection string and the CA
// certificate its provider requires, and which database it must never share.
export type DatabaseSource = { url: string; ca: string; distinctFrom?: DatabaseSource };
export const applicationDatabase: DatabaseSource = { url: 'DATABASE_URL', ca: 'DATABASE_CA_CERT' };
// The family deletion ledger is kept outside the application database and its
// backups: restoring a backup that held the ledger would roll back the very
// entries meant to clear it.
export const deletionLedgerDatabase: DatabaseSource = {
  url: 'DELETION_LEDGER_URL',
  ca: 'DELETION_LEDGER_CA_CERT',
  distinctFrom: applicationDatabase,
};

export function databaseOptions(
  env: NodeJS.ProcessEnv,
  source: DatabaseSource = applicationDatabase,
): pg.PoolConfig {
  const value = env[source.url];
  if (!value) throw new Error(`${source.url} is required`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error(`${source.url} must use PostgreSQL`);
  checkDistinct(env, source, url);
  if (env.VERCEL !== '1' && env.STAGING_DATABASE !== 'true') return { connectionString: value };
  checkHostedConnection(url);
  url.search = '';
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ca: env[source.ca],
    },
  };
}

// The user is part of where a connection leads: a shared pooler can serve
// several databases at one host and database name and tell them apart by the
// user.
const location = (url: URL) =>
  `${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`;

function checkDistinct(env: NodeJS.ProcessEnv, source: DatabaseSource, url: URL) {
  const other = source.distinctFrom && env[source.distinctFrom.url];
  if (other && location(new URL(other)) === location(url))
    throw new Error(
      `${source.url} must name a different database from ${source.distinctFrom!.url}`,
    );
}

function checkHostedConnection(url: URL) {
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('Staging PostgreSQL requires verified TLS (sslmode=verify-full)');
  }
  const transactionPool = url.hostname.includes('-pooler.') || url.port === '6543';
  if (transactionPool)
    throw new Error('Use direct PostgreSQL or a session pooler, not transaction pooling');
  for (const key of [...url.searchParams.keys()]) {
    if (key !== 'sslmode') throw new Error('Unsupported staging database connection option');
  }
}
