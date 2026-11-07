import type { AiHelpFallback } from '@education/contracts';
import { createVoiceRecorder, type RecorderFailure, type RecorderHost } from '../voice/recorder';
import { createAiHelpRequest } from './ai-help-request';
import type { LearningScope } from './learning-request';
import { requestTranscription } from './transcription-request';

export type VoiceState =
  | { status: 'idle' | 'starting' | 'recording' | 'transcribing' | 'guidance' | 'unheard' }
  | { status: 'review'; text: string }
  | { status: 'unavailable'; reason: RecorderFailure }
  | { status: 'fallback'; reason: AiHelpFallback };

// An empty text means the provider heard nothing.
type Heard = { status: 'ready'; text: string };
type RequestState =
  Heard | { status: 'pending' | 'guidance' } | { status: 'fallback'; reason: AiHelpFallback };

function fromRequest(state: RequestState): VoiceState {
  switch (state.status) {
    case 'pending':
      return { status: 'transcribing' };
    case 'guidance':
      return { status: 'guidance' };
    case 'ready':
      return state.text ? { status: 'review', text: state.text } : { status: 'unheard' };
    default:
      return state;
  }
}

// Records one answer for a step and asks for its transcription. One request
// runs at a time, a slow one can be abandoned for typing, and a late reply
// after that is ignored.
export function createVoiceInput(update: (state: VoiceState) => void, host?: RecorderHost) {
  const requests = createAiHelpRequest<Heard>((next) => update(fromRequest(next)));
  let target: { scope: LearningScope; stepId: string } | undefined;
  const recorder = createVoiceRecorder(
    {
      onStart: () => update({ status: 'recording' }),
      onFail: (reason) => update({ status: 'unavailable', reason }),
      onStop(recording) {
        if (!target) return;
        const { scope, stepId } = target;
        void requests.request(async (signal) => {
          const result = await requestTranscription(scope, { stepId, recording }, signal);
          if (result.status === 'fallback') return result;
          return { status: 'ready', text: result.status === 'ready' ? result.text : '' };
        });
      },
    },
    host,
  );
  const dispose = () => {
    recorder.cancel();
    requests.dispose();
  };
  return {
    start(scope: LearningScope, stepId: string) {
      dispose();
      target = { scope, stepId };
      update({ status: 'starting' });
      void recorder.start();
    },
    stop: recorder.stop,
    cancel() {
      dispose();
      update({ status: 'idle' });
    },
    guide: requests.guide,
    dispose,
  };
}
