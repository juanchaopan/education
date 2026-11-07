import { useEffect, useState } from 'react';
import type { RecorderHost } from '../voice/recorder';
import type { LearningScope } from './learning-request';
import { createVoiceInput, type VoiceState } from './voice-input';

export type { VoiceState } from './voice-input';

// Voice input for one step: the child starts and stops a short recording,
// reads and corrects what was heard, and only a confirmed text reaches the
// step. Nothing heard, a refused microphone or a failed request leaves typing
// open and never counts as a mistake.
export function useVoiceInput(
  scope: LearningScope,
  stepId: string,
  onConfirm: (text: string) => void,
  host?: RecorderHost,
) {
  const [state, setState] = useState<VoiceState>({ status: 'idle' });
  const [voice] = useState(() => createVoiceInput(setState, host));
  useEffect(() => () => voice.dispose(), [voice]);

  const reset = () => setState({ status: 'idle' });
  return {
    state,
    start: () => voice.start(scope, stepId),
    stop: voice.stop,
    cancel: voice.cancel,
    guide: voice.guide,
    edit: (text: string) => setState({ status: 'review', text }),
    confirm() {
      if (state.status !== 'review' || !state.text.trim()) return;
      onConfirm(state.text.trim());
      reset();
    },
    discard: reset,
  };
}
