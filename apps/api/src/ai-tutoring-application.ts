import type pg from 'pg';
import { createAiConsent } from './ai-consent-application.js';
import { createTutoringGateway } from './ai/services/tutoring-gateway.js';
import { readConfig } from './shared/config.js';

export function createAiTutoring(pool: pg.Pool, env = process.env, send = fetch) {
  const consent = createAiConsent(pool);
  const { paidAiEnabled } = readConfig(env);
  return createTutoringGateway(
    {
      paidAiEnabled,
      apiKey: env.OPENAI_API_KEY?.trim() ?? '',
      eligible: env.OPENAI_TUTORING_ELIGIBLE === 'true',
    },
    (credentials, start) => consent.dispatch(credentials, 'openai-tutoring', start),
    send,
  );
}
