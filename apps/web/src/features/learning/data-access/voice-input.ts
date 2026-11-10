import type { AiHelpFallback, TranscriptionResult } from '@education/contracts';
import { usesMicrophone, type MicrophoneTurn } from '../voice/microphone-turn';
import {
  browserHost,
  createVoiceRecorder,
  type Loudness,
  type RecorderFailure,
  type RecorderHost,
  type RecordingMode,
} from '../voice/recorder';
import { createAiHelpRequest } from './ai-help-request';
import type { LearningScope } from './learning-request';
import { requestTranscription } from './transcription-request';

// A recording under way carries how loud the microphone is, where it can be
// measured, for a meter that moves with the child's voice.
export type VoiceState =
  | { status: 'idle' | 'starting' | 'transcribing' | 'guidance' | 'unheard' }
  | { status: 'recording'; level?: Loudness }
  | { status: 'review'; text: string }
  | { status: 'unavailable'; reason: RecorderFailure }
  | { status: 'fallback'; reason: AiHelpFallback };

type RequestState = TranscriptionResult | { status: 'pending' | 'guidance' };
type Target = { scope: LearningScope; stepId: string };
type Transcriptions = ReturnType<typeof createAiHelpRequest<TranscriptionResult>>;
// `audio` is the lesson's audio context, which the microphone is measured
// on; `host` stands in for the browser's microphone.
export type VoiceOptions = {
  host?: RecorderHost;
  turn?: MicrophoneTurn;
  audio?: () => AudioContext | undefined;
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
  host: RecorderHost,
) {
  return createVoiceRecorder(
    {
      onStart: (level) => set({ status: 'recording', level }),
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

// Records what the child says for a step, asks for its transcription and holds
// what was heard while the child reads it over and corrects it. A recording is
// held to speak and ends when the child lets go, or listens on its own and
// ends when the child falls quiet. With a lesson's microphone turn it starts
// only while no one else is speaking, and a listening one gives way to a child
// pressing to speak. One request runs at a time, a slow one can be abandoned,
// a late reply after that is ignored, and only a confirmed, non-empty text is
// handed on.
export function createVoiceInput(
  update: (state: VoiceState) => void,
  { host, turn, audio }: VoiceOptions = {},
) {
  const owner = Symbol('voice input');
  let state: VoiceState = { status: 'idle' };
  let target: Target | undefined;
  const set = (next: VoiceState) => {
    state = next;
    if (!usesMicrophone(next.status)) turn?.give(owner);
    update(state);
  };
  const requests = createAiHelpRequest<TranscriptionResult>((next) => set(fromRequest(next)));
  const recorder = transcribingRecorder(set, requests, () => target, host ?? browserHost(audio));
  const dispose = () => {
    recorder.cancel();
    requests.dispose();
  };
  const cancel = () => {
    dispose();
    set({ status: 'idle' });
  };
  return {
    // Returns whether the microphone could be had.
    start(scope: LearningScope, stepId: string, mode: RecordingMode) {
      if (turn && !turn.take(owner, mode === 'listen' ? cancel : undefined)) return false;
      dispose();
      target = { scope, stepId };
      set({ status: 'starting' });
      void recorder.start(mode);
      return true;
    },
    // The child letting go of the button. A finished recording goes to
    // recognition at once, so the child sees it is being handled.
    release() {
      if (!usesMicrophone(state.status)) return;
      if (state.status === 'recording') set({ status: 'transcribing' });
      recorder.stop();
    },
    cancel,
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
    // Whether someone else is speaking, so this input cannot start.
    blocked: () => !!turn?.blocks(owner),
    dispose() {
      dispose();
      turn?.give(owner);
    },
  };
}
