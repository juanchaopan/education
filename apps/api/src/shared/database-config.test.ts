import { expect, it } from 'vitest';
import { databaseOptions } from './database-config.js';

const pooler = 'postgres://postgres.project:fixture@aws-0-ap-southeast-1.pooler.supabase.com';

it('accepts Supabase session pooling with certificate verification and an optional provider CA', () => {
  const options = databaseOptions({
    STAGING_DATABASE: 'true',
    DATABASE_URL: `${pooler}:5432/postgres?sslmode=verify-full`,
    DATABASE_CA_CERT: 'public-provider-ca-fixture',
  });
  expect(options.connectionString).not.toContain('sslmode');
  expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: 'public-provider-ca-fixture' });
});

it('rejects transaction pooling and TLS overrides before opening a connection', () => {
  for (const suffix of [
    ':6543/postgres?sslmode=verify-full',
    ':5432/postgres?sslmode=no-verify',
    ':5432/postgres?sslmode=verify-full&uselibpqcompat=true',
  ]) {
    expect(() => databaseOptions({ VERCEL: '1', DATABASE_URL: `${pooler}${suffix}` })).toThrow();
  }
});

it('reads another database from its own variables under the same rules', () => {
  const source = { url: 'OTHER_DATABASE_URL', ca: 'OTHER_DATABASE_CA_CERT' };
  const options = databaseOptions(
    {
      VERCEL: '1',
      DATABASE_URL: 'postgres://ignored',
      OTHER_DATABASE_URL: `${pooler}:5432/postgres?sslmode=verify-full`,
      OTHER_DATABASE_CA_CERT: 'other-provider-ca-fixture',
    },
    source,
  );
  expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: 'other-provider-ca-fixture' });
  expect(() => databaseOptions({}, source)).toThrow('OTHER_DATABASE_URL is required');
  expect(() =>
    databaseOptions({ VERCEL: '1', OTHER_DATABASE_URL: `${pooler}:6543/postgres` }, source),
  ).toThrow();
});
