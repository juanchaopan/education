import { readMailConfig } from '../apps/api/dist/shared/mail-config.js';
export function stagingMailEnv(env, origin) {
  if (env.MAIL_ENABLED !== 'true') return { MAIL_ENABLED: 'false' };
  const config = readMailConfig({ ...env, REGISTRATION_ENABLED: 'true', APP_ORIGIN: origin });
  return {
    MAIL_ENABLED: 'true',
    MAIL_PROVIDER_APPROVED: 'true',
    GMAIL_USER: config.user,
    GMAIL_APP_PASSWORD: config.password,
    MAIL_PAYLOAD_KEY: config.payloadKey,
  };
}
