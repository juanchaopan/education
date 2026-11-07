import type pg from 'pg';
import { aiProvider } from './ai-provider-application.js';
import { createTutoringGateway } from './ai/services/tutoring-gateway.js';

export function createAiTutoring(pool: pg.Pool, env = process.env, send = fetch) {
  return createTutoringGateway(
    ...aiProvider(pool, env, 'openai-tutoring', 'OPENAI_TUTORING_ELIGIBLE'),
    send,
  );
}
