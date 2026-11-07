import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingDatabaseEnv } from './staging-database-env.mjs';

const host = (name, endpoint = '') => `ep-${name}-a1b2c3d4${endpoint}.ap-southeast-1.aws.neon.tech`;
const connection = (address, query = '?sslmode=verify-full', database = 'neondb') =>
  `postgres://neondb_owner:fixture@${address}/${database}${query}`;
const env = {
  STAGING_DATABASE_HOST: host('application'),
  DATABASE_URL: connection(host('application')),
};

test('the application database must use the host named for staging', () => {
  assert.deepEqual(stagingDatabaseEnv(env), {
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_CA_CERT: '',
  });
  assert.doesNotThrow(() =>
    stagingDatabaseEnv({ ...env, STAGING_DATABASE_HOST: ` ${host('APPLICATION')} ` }),
  );
  assert.throws(
    () => stagingDatabaseEnv({ ...env, STAGING_DATABASE_HOST: '' }),
    /STAGING_DATABASE_HOST/,
  );
  assert.throws(
    () => stagingDatabaseEnv({ ...env, DATABASE_URL: connection(host('other')) }),
    /host named by STAGING_DATABASE_HOST/,
  );
  assert.throws(
    () => stagingDatabaseEnv({ ...env, DATABASE_URL: undefined }),
    /DATABASE_URL is required/,
  );
});

test('both databases follow the hosted connection rules', () => {
  const pooled = host('application', '-pooler');
  for (const [each, reason] of [
    [{ ...env, DATABASE_URL: connection(host('application'), '') }, /verify-full/],
    [{ ...env, DATABASE_URL: connection(host('application'), '?sslmode=require') }, /verify-full/],
    [
      {
        ...env,
        DATABASE_URL: connection(
          host('application'),
          '?sslmode=verify-full&channel_binding=require',
        ),
      },
      /Unsupported/,
    ],
    [{ STAGING_DATABASE_HOST: pooled, DATABASE_URL: connection(pooled) }, /transaction pooling/],
    [
      { ...env, DELETION_LEDGER_URL: connection(host('ledger'), '?sslmode=require') },
      /verify-full/,
    ],
  ])
    assert.throws(() => stagingDatabaseEnv(each), reason);
});

test('the optional deletion ledger must sit on another host', () => {
  const withLedger = {
    ...env,
    DELETION_LEDGER_URL: connection(host('ledger')),
    DELETION_LEDGER_CA_CERT: 'ledger-provider-ca-fixture',
  };
  assert.deepEqual(stagingDatabaseEnv(withLedger), {
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_CA_CERT: '',
    DELETION_LEDGER_URL: withLedger.DELETION_LEDGER_URL,
    DELETION_LEDGER_CA_CERT: 'ledger-provider-ca-fixture',
  });
  assert.throws(
    () =>
      stagingDatabaseEnv({
        ...env,
        DELETION_LEDGER_URL: connection(host('application'), '?sslmode=verify-full', 'ledger'),
      }),
    /different host/,
  );
});
