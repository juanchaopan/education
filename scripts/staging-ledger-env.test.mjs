import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingLedgerEnv } from './staging-ledger-env.mjs';

const application = 'applicationprojectre';
const pooled = (ref) =>
  `postgres://postgres.${ref}:fixture@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full`;
const direct = (ref) =>
  `postgres://postgres:fixture@db.${ref}.supabase.co:5432/postgres?sslmode=verify-full`;
const env = {
  STAGING_SUPABASE_PROJECT_REF: application,
  DATABASE_URL: pooled(application),
  DELETION_LEDGER_URL: pooled('ledgerprojectrefabcd'),
  DELETION_LEDGER_CA_CERT: 'ledger-provider-ca-fixture',
};

test('the staging deletion ledger is optional and passes its own verified connection on', () => {
  assert.deepEqual(stagingLedgerEnv({}), {});
  assert.deepEqual(stagingLedgerEnv(env), {
    DELETION_LEDGER_URL: env.DELETION_LEDGER_URL,
    DELETION_LEDGER_CA_CERT: 'ledger-provider-ca-fixture',
  });
  assert.throws(() =>
    stagingLedgerEnv({ ...env, DELETION_LEDGER_URL: env.DELETION_LEDGER_URL.split('?')[0] }),
  );
});

test('the staging deletion ledger is refused inside the application project, however it is reached', () => {
  for (const connection of [env.DATABASE_URL.replace('fixture', 'other'), direct(application)])
    assert.throws(() => stagingLedgerEnv({ ...env, DELETION_LEDGER_URL: connection }));
});
