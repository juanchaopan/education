import { readConfig } from '../apps/api/dist/shared/config.js';

const settings = [
  'OPENAI_API_KEY',
  'OPENAI_TUTORING_ELIGIBLE',
  'OPENAI_TRANSCRIPTION_ELIGIBLE',
  'AI_MONTHLY_BUDGET_USD',
];

// The paid AI settings staging runs with. Without a backend key there are
// none, so no request leaves and nothing is spent. With a key, each service
// stays off unless it is marked eligible, and a monthly budget is required,
// since anyone can open staging. The API's own configuration rules check the
// values, so a release fails here rather than on the first request.
export function stagingAiEnv(env) {
  if (!env.OPENAI_API_KEY?.trim()) return {};
  if (!env.AI_MONTHLY_BUDGET_USD) throw new Error('Staging AI needs AI_MONTHLY_BUDGET_USD');
  const given = Object.fromEntries(
    settings.filter((name) => env[name]).map((name) => [name, env[name]]),
  );
  readConfig(given);
  return { OPENAI_TUTORING_ELIGIBLE: 'false', OPENAI_TRANSCRIPTION_ELIGIBLE: 'false', ...given };
}
