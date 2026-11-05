import type pg from 'pg';

export function databaseOptions(env: NodeJS.ProcessEnv): pg.PoolConfig {
  const value = env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must use PostgreSQL');
  if (env.VERCEL !== '1' && env.STAGING_DATABASE !== 'true') return { connectionString: value };
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('Staging PostgreSQL requires verified TLS (sslmode=verify-full)');
  }
  const transactionPool = url.hostname.includes('-pooler.') || url.port === '6543';
  if (transactionPool)
    throw new Error('Use direct PostgreSQL or a session pooler, not transaction pooling');
  for (const key of [...url.searchParams.keys()]) {
    if (key !== 'sslmode') throw new Error('Unsupported staging database connection option');
  }
  url.search = '';
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ca: env.DATABASE_CA_CERT,
    },
  };
}
