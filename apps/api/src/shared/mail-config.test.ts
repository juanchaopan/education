import { expect, it } from 'vitest';
import { readMailConfig } from './mail-config.js';
const env = {
  MAIL_ENABLED: 'true',
  MAIL_PROVIDER_APPROVED: 'true',
  REGISTRATION_ENABLED: 'true',
  GMAIL_USER: 'test@gmail.com',
  GMAIL_APP_PASSWORD: 'abcdefghijklmnop',
  MAIL_PAYLOAD_KEY: 'ab'.repeat(32),
  APP_ORIGIN: 'https://school.example',
};
it('keeps mail disabled without a switch and fails closed for unreviewed eligibility or incomplete credentials', () => {
  expect(readMailConfig({})).toBeUndefined();
  expect(readMailConfig(env)?.origin).toBe('https://school.example');
  for (const patch of [
    { MAIL_PROVIDER_APPROVED: 'false' },
    { MAIL_PAYLOAD_KEY: 'weak' },
    { GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' },
    { APP_ORIGIN: 'http://school.example' },
    { GMAIL_USER: 'spoof@hyp.app' },
  ]) {
    expect(() => readMailConfig({ ...env, ...patch })).toThrow();
  }
});
