import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingAiEnv } from './staging-ai-env.mjs';

const key = 'fixture-key';

test('staging runs without paid AI until a backend key is configured', () => {
  assert.deepEqual(stagingAiEnv({}), {});
  assert.deepEqual(stagingAiEnv({ OPENAI_API_KEY: '  ', OPENAI_TUTORING_ELIGIBLE: 'true' }), {});
});

test('staging AI with a key needs a monthly budget', () => {
  assert.throws(() => stagingAiEnv({ OPENAI_API_KEY: key }), /AI_MONTHLY_BUDGET_USD/);
});

test('staging AI keeps each service off unless it is marked eligible', () => {
  assert.deepEqual(stagingAiEnv({ OPENAI_API_KEY: key, AI_MONTHLY_BUDGET_USD: '5' }), {
    OPENAI_API_KEY: key,
    OPENAI_TUTORING_ELIGIBLE: 'false',
    OPENAI_TRANSCRIPTION_ELIGIBLE: 'false',
    AI_MONTHLY_BUDGET_USD: '5',
  });
  assert.deepEqual(
    stagingAiEnv({
      OPENAI_API_KEY: key,
      OPENAI_TUTORING_ELIGIBLE: 'true',
      OPENAI_TRANSCRIPTION_ELIGIBLE: 'true',
      AI_MONTHLY_BUDGET_USD: '5',
      PIN_PEPPER: 'not an AI setting',
    }),
    {
      OPENAI_API_KEY: key,
      OPENAI_TUTORING_ELIGIBLE: 'true',
      OPENAI_TRANSCRIPTION_ELIGIBLE: 'true',
      AI_MONTHLY_BUDGET_USD: '5',
    },
  );
});

test('staging AI settings follow the API configuration rules', () => {
  const env = { OPENAI_API_KEY: key, AI_MONTHLY_BUDGET_USD: '5' };
  assert.throws(() => stagingAiEnv({ ...env, OPENAI_TUTORING_ELIGIBLE: 'yes' }), /true or false/);
  assert.throws(() => stagingAiEnv({ ...env, AI_MONTHLY_BUDGET_USD: 'five' }), /USD amount/);
});
