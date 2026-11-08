import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { databaseOptions } from './database-config.js';

const schema = Type.Object({
  port: Type.Integer({ minimum: 1, maximum: 65535 }),
  host: Type.String({ minLength: 1 }),
});

export type Config = ReturnType<typeof readConfig>;
export type AiConfig = Config['ai'];

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '127.0.0.1',
  };
  if (!Value.Check(schema, config)) throw new Error('Invalid application configuration');
  checkBoolean(env, 'REGISTRATION_ENABLED');
  if (env.PIN_PEPPER && !/^[a-fA-F0-9]{64}$/.test(env.PIN_PEPPER))
    throw new Error('PIN_PEPPER must contain 64 hexadecimal characters');
  return { ...config, ...readRegistrationConfig(env), ai: readAiConfig(env) };
}

// The paid AI switch, the backend key, each service's own eligibility, which
// is set only once the service is cleared for children's data, and the
// monthly budget.
function readAiConfig(env: NodeJS.ProcessEnv) {
  for (const name of [
    'PAID_AI_ENABLED',
    'OPENAI_TUTORING_ELIGIBLE',
    'OPENAI_TRANSCRIPTION_ELIGIBLE',
  ])
    checkBoolean(env, name);
  return {
    paidAiEnabled: env.PAID_AI_ENABLED !== 'false',
    apiKey: env.OPENAI_API_KEY?.trim() ?? '',
    eligible: {
      'openai-tutoring': env.OPENAI_TUTORING_ELIGIBLE === 'true',
      'openai-transcription': env.OPENAI_TRANSCRIPTION_ELIGIBLE === 'true',
    },
    monthlyBudget: readAiMonthlyBudget(env.AI_MONTHLY_BUDGET_USD),
  };
}

function readAiMonthlyBudget(value: string | undefined) {
  if (!value) return null;
  if (!/^\d{1,9}(\.\d{1,9})?$/.test(value))
    throw new Error('AI_MONTHLY_BUDGET_USD must be a nonnegative decimal USD amount');
  const [dollars, fraction = ''] = value.split('.');
  return BigInt(dollars!) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
}

function checkBoolean(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name];
  if (value && !['true', 'false'].includes(value)) throw new Error(`${name} must be true or false`);
}

function readRegistrationConfig(env: NodeJS.ProcessEnv) {
  const registrationEnabled = env.REGISTRATION_ENABLED === 'true';
  const origin = env.APP_ORIGIN ?? 'http://127.0.0.1:5173';
  const url = new URL(origin);
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('APP_ORIGIN must be an exact HTTP(S) origin');
  }
  if (
    (env.NODE_ENV === 'production' || env.VERCEL === '1') &&
    registrationEnabled &&
    url.protocol !== 'https:'
  ) {
    throw new Error('Registration requires an HTTPS APP_ORIGIN in production');
  }
  if (registrationEnabled) validateRegistrationSecrets(env);
  return {
    pinPepper: env.PIN_PEPPER,
    registrationEnabled,
    origin,
    databaseUrl: env.DATABASE_URL,
    rateLimitKey: env.AUTH_RATE_LIMIT_KEY,
    connectionTimeoutMs: env.VERCEL === '1' ? 3000 : 1000,
  };
}

function validateRegistrationSecrets(env: NodeJS.ProcessEnv) {
  if (!env.DATABASE_URL || (env.AUTH_RATE_LIMIT_KEY?.length ?? 0) < 32) {
    throw new Error('Registration requires DATABASE_URL and AUTH_RATE_LIMIT_KEY (32+ characters)');
  }
  if (!isPostgresUrl(env.DATABASE_URL)) {
    throw new Error('DATABASE_URL must use PostgreSQL');
  }
  databaseOptions(env);
}

function isPostgresUrl(value: string) {
  try {
    return ['postgres:', 'postgresql:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
