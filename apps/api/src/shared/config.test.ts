import { expect, it } from 'vitest';
import { readConfig } from './config.js';

it('distinguishes an unset AI budget from zero and parses exact USD amounts', () => {
  expect(readConfig({}).aiMonthlyBudget).toBeNull();
  expect(readConfig({}).paidAiEnabled).toBe(true);
  expect(readConfig({ AI_MONTHLY_BUDGET_USD: '0' }).aiMonthlyBudget).toBe(0n);
  expect(readConfig({ AI_MONTHLY_BUDGET_USD: '1.000000001' }).aiMonthlyBudget).toBe(1_000_000_001n);
  for (const value of ['-1', '1e2', '0.0000000001', 'Infinity']) {
    expect(() => readConfig({ AI_MONTHLY_BUDGET_USD: value })).toThrow('AI_MONTHLY_BUDGET_USD');
  }
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
