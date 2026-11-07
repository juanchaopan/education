import type { FastifyInstance } from 'fastify';
import {
  transcriptionBodyLimit,
  TranscriptionRequest,
  TranscriptionResult,
} from '@education/contracts';
import type { VoiceTranscriptionService } from '../services/voice-transcription.js';
import { registerChildAiRequest } from './child-ai-request.js';

export function registerTranscription(
  app: FastifyInstance,
  origin: string,
  transcription?: VoiceTranscriptionService,
) {
  registerChildAiRequest(
    app,
    origin,
    {
      resource: 'transcription',
      bodyLimit: transcriptionBodyLimit,
      body: TranscriptionRequest,
      reply: TranscriptionResult,
    },
    transcription,
  );
}
