import { useEffect, useState } from 'react';
import { useReloadReadiness } from '../../../shared/lib/reload-readiness';
import type { RecorderHost } from '../voice/recorder';
import type { LearningScope } from './learning-request';
import { createVoiceInput, type VoiceState } from './voice-input';
import { voiceReadiness } from './voice-readiness';

export type { VoiceState } from './voice-input';

// Voice input for one step: the child starts and stops a short recording,
// reads and corrects what was heard, and only a confirmed text reaches the
// step. Nothing heard, a refused microphone or a failed request leaves typing
// open and never counts as a mistake. A reload waits while the child speaks
// and until what was heard is confirmed.
export function useVoiceInput(
  scope: LearningScope,
  stepId: string,
  onConfirm: (text: string) => void,
  host?: RecorderHost,
) {
  const [state, setState] = useState<VoiceState>({ status: 'idle' });
  const [voice] = useState(() => createVoiceInput(setState, { host }));
  useEffect(() => () => voice.dispose(), [voice]);
  useReloadReadiness(voiceReadiness(state));
  return {
    ...voice,
    state,
    start: () => voice.start(scope, stepId),
    confirm() {
      const text = voice.confirm();
      if (text) onConfirm(text);
    },
  };
}
