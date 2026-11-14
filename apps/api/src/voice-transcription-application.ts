import type pg from 'pg';
import { problemRegistry, type ProblemRegistry } from '@education/problems/server';
import { aiProvider } from './ai-provider-application.js';
import { createTranscriptionGateway } from './ai/services/transcription-gateway.js';
import { createVoiceTranscriptionService } from './ai/services/voice-transcription.js';
import { childProblemAuthenticator } from './child-problem-transaction.js';

export function createVoiceTranscription(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  registry: ProblemRegistry = problemRegistry,
) {
  return createVoiceTranscriptionService(
    childProblemAuthenticator(pool, registry.bookOf),
    registry.find,
    createTranscriptionGateway(...aiProvider(pool, env, 'openai-transcription'), send),
  );
}
