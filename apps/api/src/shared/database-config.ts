import type pg from 'pg';

// Which environment variables hold a database's connection string and the CA
// certificate its provider requires.
export type DatabaseSource = { url: string; ca: string };
export const applicationDatabase: DatabaseSource = { url: 'DATABASE_URL', ca: 'DATABASE_CA_CERT' };

export function databaseOptions(
  env: NodeJS.ProcessEnv,
  source: DatabaseSource = applicationDatabase,
): pg.PoolConfig {
  const value = env[source.url];
  if (!value) throw new Error(`${source.url} is required`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error(`${source.url} must use PostgreSQL`);
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
