import type pg from 'pg';
import { problemRegistry } from '@education/problems/server';
import { aiProvider } from './ai-provider-application.js';
import { createTranscriptionGateway } from './ai/services/transcription-gateway.js';
import { createVoiceTranscriptionService } from './ai/services/voice-transcription.js';
import { childProblemAuthenticator } from './child-problem-transaction.js';

export function createVoiceTranscription(
  pool: pg.Pool,
  env = process.env,
  send = fetch,
  find = (id: string, version: number) => problemRegistry.find(id, version),
) {
  return createVoiceTranscriptionService(
    childProblemAuthenticator(pool),
    find,
    createTranscriptionGateway(...aiProvider(pool, env, 'openai-transcription'), send),
  );
}
