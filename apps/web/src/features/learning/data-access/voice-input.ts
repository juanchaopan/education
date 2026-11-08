import type { AiHelpFallback, TranscriptionResult } from '@education/contracts';
import { createVoiceRecorder, type RecorderFailure, type RecorderHost } from '../voice/recorder';
import { createAiHelpRequest } from './ai-help-request';
import type { LearningScope } from './learning-request';
import { requestTranscription } from './transcription-request';

export type VoiceState =
  | { status: 'idle' | 'starting' | 'recording' | 'transcribing' | 'guidance' | 'unheard' }
  | { status: 'review'; text: string }
  | { status: 'unavailable'; reason: RecorderFailure }
  | { status: 'fallback'; reason: AiHelpFallback };

type RequestState = TranscriptionResult | { status: 'pending' | 'guidance' };
type Target = { scope: LearningScope; stepId: string };
type Transcriptions = ReturnType<typeof createAiHelpRequest<TranscriptionResult>>;
type Options = {
  host?: RecorderHost;
  // Hands what was heard straight on, without a review: for a question,
  // which is not an answer and has nothing to confirm.
  onHeard?: (text: string) => void;
};

function fromRequest(state: RequestState): VoiceState {
  switch (state.status) {
    case 'pending':
      return { status: 'transcribing' };
    case 'guidance':
      return { status: 'guidance' };
    case 'ready':
      return { status: 'review', text: state.text };
    default:
      return state;
  }
}

// A finished recording is sent once, for the step it was started on.
function transcribingRecorder(
  set: (state: VoiceState) => void,
  requests: Transcriptions,
  target: () => Target | undefined,
  host?: RecorderHost,
) {
  return createVoiceRecorder(
    {
      onStart: () => set({ status: 'recording' }),
      onFail: (reason) => set({ status: 'unavailable', reason }),
      onStop(recording) {
        const step = target();
        if (!step) return;
        void requests.request((signal) =>
          requestTranscription(step.scope, { stepId: step.stepId, recording }, signal),
        );
      },
    },
    host,
  );
}

// Records one answer for a step, asks for its transcription and holds what was
// heard while the child corrects it. One request runs at a time, a slow one can
// be abandoned for typing, a late reply after that is ignored, and only a
// confirmed, non-empty text is handed on.
export function createVoiceInput(
  update: (state: VoiceState) => void,
  { host, onHeard }: Options = {},
) {
  let state: VoiceState = { status: 'idle' };
  let target: Target | undefined;
  const set = (next: VoiceState) => {
    const heard = onHeard && next.status === 'review' ? next.text.trim() : undefined;
    state = heard === undefined ? next : { status: 'idle' };
    update(state);
    if (heard) onHeard?.(heard);
  };
  const requests = createAiHelpRequest<TranscriptionResult>((next) => set(fromRequest(next)));
  const recorder = transcribingRecorder(set, requests, () => target, host);
  const dispose = () => {
    recorder.cancel();
    requests.dispose();
  };
  return {
    start(scope: LearningScope, stepId: string) {
      dispose();
      target = { scope, stepId };
      set({ status: 'starting' });
      void recorder.start();
    },
    // Recognition starts as soon as the recording closes, so the child sees it
    // is being handled and cannot drop the finished recording by mistake.
    stop() {
      if (state.status !== 'recording') return;
      set({ status: 'transcribing' });
      recorder.stop();
    },
    cancel() {
      dispose();
      set({ status: 'idle' });
    },
    guide: requests.guide,
    edit(text: string) {
      if (state.status === 'review') set({ status: 'review', text });
    },
    // Returns the text the child confirmed, if there is any to confirm.
    confirm() {
      const text = state.status === 'review' ? state.text.trim() : '';
      if (text) set({ status: 'idle' });
      return text || undefined;
    },
    discard() {
      if (state.status === 'review') set({ status: 'idle' });
    },
    dispose,
  };
}
