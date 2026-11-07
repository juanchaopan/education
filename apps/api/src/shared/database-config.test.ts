import { expect, it } from 'vitest';
import { databaseOptions, deletionLedgerDatabase } from './database-config.js';

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

it('reads the deletion ledger from its own variables under the same rules', () => {
  const options = databaseOptions(
    {
      VERCEL: '1',
      DATABASE_URL: 'postgres://app.example/education',
      DELETION_LEDGER_URL: `${pooler}:5432/postgres?sslmode=verify-full`,
      DELETION_LEDGER_CA_CERT: 'ledger-provider-ca-fixture',
    },
    deletionLedgerDatabase,
  );
  expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: 'ledger-provider-ca-fixture' });
  expect(() => databaseOptions({}, deletionLedgerDatabase)).toThrow(
    'DELETION_LEDGER_URL is required',
  );
  expect(() =>
    databaseOptions(
      { VERCEL: '1', DELETION_LEDGER_URL: `${pooler}:6543/postgres` },
      deletionLedgerDatabase,
    ),
  ).toThrow();
});

it('refuses a deletion ledger in the application database, whatever the credentials', () => {
  expect(() =>
    databaseOptions(
      {
        DATABASE_URL: 'postgres://app:one@db.example:5432/education',
        DELETION_LEDGER_URL: 'postgresql://ledger:two@db.example/education',
      },
      deletionLedgerDatabase,
    ),
  ).toThrow('DELETION_LEDGER_URL must name a different database from DATABASE_URL');
  expect(
    databaseOptions(
      {
        DATABASE_URL: 'postgres://app:one@db.example:5432/education',
        DELETION_LEDGER_URL: 'postgres://ledger:two@db.example:5432/education_ledger',
      },
      deletionLedgerDatabase,
    ).connectionString,
  ).toContain('education_ledger');
});
