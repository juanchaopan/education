export function readMailConfig(env: NodeJS.ProcessEnv) {
  if (env.MAIL_ENABLED && !['true', 'false'].includes(env.MAIL_ENABLED))
    throw new Error('MAIL_ENABLED must be true or false');
  if (env.MAIL_ENABLED !== 'true') return undefined;
  if (env.MAIL_PROVIDER_APPROVED !== 'true')
    throw new Error('Gmail eligibility must be reviewed before enabling mail');
  validateMailSecrets(env);
  const origin = new URL(env.APP_ORIGIN ?? '');
  if (origin.protocol !== 'https:' || origin.origin !== env.APP_ORIGIN)
    throw new Error('Verification links require an exact trusted HTTPS origin');
  return {
    user: env.GMAIL_USER!,
    password: env.GMAIL_APP_PASSWORD!,
    origin: origin.origin,
    payloadKey: env.MAIL_PAYLOAD_KEY!,
  };
}

function validateMailSecrets(env: NodeJS.ProcessEnv) {
  if (!env.REGISTRATION_ENABLED || env.REGISTRATION_ENABLED !== 'true')
    throw new Error('Verification mail requires registration');
  if (
    !/^[^\s@]+@gmail\.com$/i.test(env.GMAIL_USER ?? '') ||
    !/^[a-z]{16}$/i.test(env.GMAIL_APP_PASSWORD ?? '')
  )
    throw new Error('Gmail requires a sender and an application password without spaces');
  if (!/^[a-f0-9]{64}$/i.test(env.MAIL_PAYLOAD_KEY ?? ''))
    throw new Error('MAIL_PAYLOAD_KEY must be 32 random bytes in hex');
}
