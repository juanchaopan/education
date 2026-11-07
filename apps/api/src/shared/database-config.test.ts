import { expect, it } from 'vitest';
import { databaseOptions, deletionLedgerDatabase } from './database-config.js';

const hosted = (name: string, endpoint = '') =>
  `postgres://neondb_owner:fixture@ep-${name}-a1b2c3d4${endpoint}.ap-southeast-1.aws.neon.tech`;

it('accepts a direct hosted connection with certificate verification and an optional provider CA', () => {
  const options = databaseOptions({
    STAGING_DATABASE: 'true',
    DATABASE_URL: `${hosted('application')}/neondb?sslmode=verify-full`,
    DATABASE_CA_CERT: 'public-provider-ca-fixture',
  });
  expect(options.connectionString).not.toContain('sslmode');
  expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: 'public-provider-ca-fixture' });
});

it('rejects transaction pooling and TLS overrides before opening a connection', () => {
  for (const connection of [
    `${hosted('application', '-pooler')}/neondb?sslmode=verify-full`,
    `${hosted('application')}:6543/neondb?sslmode=verify-full`,
    `${hosted('application')}/neondb?sslmode=no-verify`,
    `${hosted('application')}/neondb?sslmode=verify-full&channel_binding=require`,
  ]) {
    expect(() => databaseOptions({ VERCEL: '1', DATABASE_URL: connection })).toThrow();
  }
});

it('reads the deletion ledger from its own variables under the same rules', () => {
  const options = databaseOptions(
    {
      VERCEL: '1',
      DATABASE_URL: 'postgres://app.example/education',
      DELETION_LEDGER_URL: `${hosted('ledger')}/neondb?sslmode=verify-full`,
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
      { VERCEL: '1', DELETION_LEDGER_URL: `${hosted('ledger', '-pooler')}/neondb` },
      deletionLedgerDatabase,
    ),
  ).toThrow();
});

it('refuses a deletion ledger that leads to the application database', () => {
  expect(() =>
    databaseOptions(
      {
        DATABASE_URL: 'postgres://app:one@db.example:5432/education',
        DELETION_LEDGER_URL: 'postgresql://app:two@db.example/education',
      },
      deletionLedgerDatabase,
    ),
  ).toThrow('DELETION_LEDGER_URL must name a different database from DATABASE_URL');
  expect(
    databaseOptions(
      {
        DATABASE_URL: 'postgres://app:one@db.example:5432/education',
        DELETION_LEDGER_URL: 'postgres://app:one@db.example:5432/education_ledger',
      },
      deletionLedgerDatabase,
    ).connectionString,
  ).toContain('education_ledger');
});

it('tells two databases behind one shared pooler apart by their users', () => {
  const database = (user: string) =>
    `postgres://${user}:fixture@shared.example:5432/postgres?sslmode=verify-full`;
  expect(
    databaseOptions(
      {
        STAGING_DATABASE: 'true',
        DATABASE_URL: database('application'),
        DELETION_LEDGER_URL: database('ledger'),
      },
      deletionLedgerDatabase,
    ).connectionString,
  ).toContain('//ledger:');
});
