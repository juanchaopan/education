import type { Readiness } from '../../../shared/lib/reload-readiness';
import type { VoiceState } from './voice-input';

// What a reload would do to what the child is saying: cut off a recording or
// the transcription on its way back, or lose the words the child is reading
// over before confirming them.
export function voiceReadiness({ status }: VoiceState): Readiness {
  if (status === 'review') return 'unsaved';
  return status === 'starting' || status === 'recording' || status === 'transcribing'
    ? 'saving'
    : 'ready';
}
