import { expect, it } from 'vitest';
import { readConfig } from './config.js';

it('distinguishes an unset AI budget from zero and parses exact USD amounts', () => {
  expect(readConfig({}).ai.monthlyBudget).toBeNull();
  expect(readConfig({ AI_MONTHLY_BUDGET_USD: '0' }).ai.monthlyBudget).toBe(0n);
  expect(readConfig({ AI_MONTHLY_BUDGET_USD: '1.000000001' }).ai.monthlyBudget).toBe(
    1_000_000_001n,
  );
  for (const value of ['-1', '1e2', '0.0000000001', 'Infinity']) {
    expect(() => readConfig({ AI_MONTHLY_BUDGET_USD: value })).toThrow('AI_MONTHLY_BUDGET_USD');
  }
});

it('keeps paid AI switched on without a key or eligibility, and reads each service’s flag strictly', () => {
  expect(readConfig({}).ai).toEqual({
    paidAiEnabled: true,
    apiKey: '',
    eligible: { 'openai-tutoring': false, 'openai-transcription': false },
    monthlyBudget: null,
  });
  const configured = readConfig({
    PAID_AI_ENABLED: 'false',
    OPENAI_API_KEY: ' synthetic-key ',
    OPENAI_TRANSCRIPTION_ELIGIBLE: 'true',
  }).ai;
  expect(configured).toMatchObject({
    paidAiEnabled: false,
    apiKey: 'synthetic-key',
    eligible: { 'openai-tutoring': false, 'openai-transcription': true },
  });
  // A mistyped flag names itself, so the operator knows which one stopped startup.
  for (const flag of [
    'REGISTRATION_ENABLED',
    'PAID_AI_ENABLED',
    'OPENAI_TUTORING_ELIGIBLE',
    'OPENAI_TRANSCRIPTION_ELIGIBLE',
  ])
    expect(() => readConfig({ [flag]: 'TRUE' })).toThrow(`${flag} must be true or false`);
});

it('counts families without a time zone in China time unless another IANA zone is set', () => {
  expect(readConfig({}).defaultTimeZone).toBe('Asia/Shanghai');
  expect(readConfig({ DEFAULT_TIME_ZONE: '' }).defaultTimeZone).toBe('Asia/Shanghai');
  expect(readConfig({ DEFAULT_TIME_ZONE: 'america/toronto' }).defaultTimeZone).toBe(
    'America/Toronto',
  );
  for (const value of ['+08:00', 'China', ' '])
    expect(() => readConfig({ DEFAULT_TIME_ZONE: value })).toThrow('DEFAULT_TIME_ZONE');
});

const env = {
  REGISTRATION_ENABLED: 'true',
  DATABASE_URL: 'postgres://localhost/isolated',
  AUTH_RATE_LIMIT_KEY: 'local-test-fixture-not-a-deployment-secret',
};

it('requires explicit registration enablement and validates credentials at startup', () => {
  expect(readConfig({}).registrationEnabled).toBe(false);
  expect(readConfig(env).registrationEnabled).toBe(true);
  expect(() => readConfig({ REGISTRATION_ENABLED: 'true' })).toThrow();
  expect(() => readConfig({ ...env, AUTH_RATE_LIMIT_KEY: 'short' })).toThrow();
  expect(() => readConfig({ ...env, DATABASE_URL: 'https://example.com' })).toThrow();
  expect(() => readConfig({ ...env, DATABASE_URL: 'invalid-url-with-private-password' })).toThrow(
    'DATABASE_URL must use PostgreSQL',
  );
});

it('accepts only an exact configured origin, requiring HTTPS in production', () => {
  expect(() => readConfig({ ...env, APP_ORIGIN: 'https://example.com/path' })).toThrow();
  expect(() => readConfig({ ...env, NODE_ENV: 'production' })).toThrow();
  expect(
    readConfig({ ...env, NODE_ENV: 'production', APP_ORIGIN: 'https://example.com' }).origin,
  ).toBe('https://example.com');
});

it('requires verified TLS and direct PostgreSQL sessions on Vercel', () => {
  const cloud = { ...env, VERCEL: '1', APP_ORIGIN: 'https://staging.example.test' };
  expect(() => readConfig(cloud)).toThrow('verified TLS');
  for (const query of ['sslmode=no-verify', 'sslmode=disable', 'sslmode=require']) {
    expect(() =>
      readConfig({ ...cloud, DATABASE_URL: `postgres://db.test/test?${query}` }),
    ).toThrow();
  }
  expect(() =>
    readConfig({
      ...cloud,
      DATABASE_URL:
        'postgres://ep-test-pooler.ap-southeast-1.aws.neon.tech/test?sslmode=verify-full',
    }),
  ).toThrow('direct');
  expect(
    readConfig({
      ...cloud,
      DATABASE_URL: 'postgres://ep-test.ap-southeast-1.aws.neon.tech/test?sslmode=verify-full',
    }).registrationEnabled,
  ).toBe(true);
});

it('accepts only a separate valid PIN pepper and leaves parent services usable when it is absent', () => {
  expect(readConfig(env).pinPepper).toBeUndefined();
  expect(readConfig({ ...env, PIN_PEPPER: 'ab'.repeat(32) }).pinPepper).toBe('ab'.repeat(32));
  expect(() => readConfig({ ...env, PIN_PEPPER: 'too-short' })).toThrow('PIN_PEPPER');
});
