import type { TranscriptionRequest, TranscriptionResult } from '@education/contracts';
import type { ProblemPlugin } from '@education/problems/server';
import { transcriptionAudio, vocabularyPrompt } from '../domain/transcription.js';
import { authoredStep } from './authored-step.js';
import type { Credentials } from './metered-call.js';
import type { TranscriptionGateway } from './transcription-gateway.js';

type Problem = { id: string; version: number };

// Turns a child's recording for one step into text the child then checks and
// corrects. Recognition never records an attempt, changes progress or stores
// the audio, so an unclear or failed recording costs the child nothing.
export function createVoiceTranscriptionService(
  authenticate: (credentials: Credentials) => Promise<void>,
  find: (id: string, version: number) => Pick<ProblemPlugin, 'feedback'> | undefined,
  transcribe: TranscriptionGateway,
) {
  return async (
    credentials: Credentials,
    problem: Problem,
    { stepId, format, audio }: TranscriptionRequest,
    signal?: AbortSignal,
  ): Promise<TranscriptionResult> => {
    await authenticate(credentials);
    const { step } = authoredStep(find(problem.id, problem.version), stepId);
    const recording = transcriptionAudio(audio, format);
    if (!recording) return { status: 'fallback', reason: 'invalid-input' };
    const reply = await transcribe(
      credentials,
      { audio: recording, format, prompt: vocabularyPrompt(step.vocabulary) },
      signal,
    );
    if (reply.status === 'fallback') return reply;
    return reply.value ? { status: 'ready', text: reply.value } : { status: 'unheard' };
  };
}

export type VoiceTranscriptionService = ReturnType<typeof createVoiceTranscriptionService>;
