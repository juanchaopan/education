import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingMailEnv } from './staging-mail-env.mjs';
test('staging mail stays disabled until eligibility and all server credentials are configured', () => {
  assert.deepEqual(stagingMailEnv({}, 'https://school.example'), { MAIL_ENABLED: 'false' });
  assert.throws(() => stagingMailEnv({ MAIL_ENABLED: 'true' }, 'https://school.example'));
  const env = {
    MAIL_ENABLED: 'true',
    MAIL_PROVIDER_APPROVED: 'true',
    GMAIL_USER: 'fixture@gmail.com',
    GMAIL_APP_PASSWORD: 'abcdefghijklmnop',
    MAIL_PAYLOAD_KEY: 'ab'.repeat(32),
  };
  assert.equal(stagingMailEnv(env, 'https://school.example').MAIL_ENABLED, 'true');
  assert.throws(() =>
    stagingMailEnv({ ...env, MAIL_PROVIDER_APPROVED: 'false' }, 'https://school.example'),
  );
});
