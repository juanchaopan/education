import type pg from 'pg';
import { createAiConsent } from './ai-consent-application.js';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import { createTutoringGateway } from './ai/services/tutoring-gateway.js';
import { readConfig } from './shared/config.js';

export function createAiTutoring(pool: pg.Pool, env = process.env, send = fetch) {
  const { paidAiEnabled, aiMonthlyBudget } = readConfig(env);
  const consent = createAiConsent(pool, aiMonthlyBudget);
  const usage = createTutoringUsage(pool, aiMonthlyBudget);
  return createTutoringGateway(
    {
      paidAiEnabled,
      apiKey: env.OPENAI_API_KEY?.trim() ?? '',
      eligible: env.OPENAI_TUTORING_ELIGIBLE === 'true',
    },
    (credentials, start) => consent.dispatch(credentials, 'openai-tutoring', start),
    {
      reserve: (credentials, amount) =>
        consent.withChildConsent(credentials, 'openai-tutoring', (client, child) =>
          usage.reserve(client, child, amount),
        ),
      settle: usage.settle,
    },
    send,
  );
}
