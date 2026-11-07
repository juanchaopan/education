import {
  transcriptionAudioMaxBytes,
  TranscriptionRequest,
  TranscriptionResult,
} from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import type { Recording } from '../voice/recorder';
import { postLearning, toBase64, type LearningScope } from './learning-request';

// Sends one finished recording for a step. A recording the server would refuse
// never leaves the browser; the reply is checked against the shared schema and
// only ever proposes text for the child to correct.
export async function requestTranscription(
  scope: LearningScope,
  { stepId, recording }: { stepId: string; recording: Recording },
  cancel?: AbortSignal,
): Promise<TranscriptionResult> {
  if (recording.audio.size > transcriptionAudioMaxBytes)
    return { status: 'fallback', reason: 'invalid-input' };
  const request = { stepId, format: recording.format, audio: await toBase64(recording.audio) };
  if (!Value.Check(TranscriptionRequest, request))
    return { status: 'fallback', reason: 'invalid-input' };
  return postLearning(scope, 'transcription', JSON.stringify(request), TranscriptionResult, cancel);
}
