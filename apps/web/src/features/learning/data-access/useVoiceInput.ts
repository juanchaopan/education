import { useEffect, useState, useSyncExternalStore } from 'react';
import { useReloadReadiness } from '../../../shared/lib/reload-readiness';
import type { RecordingMode } from '../voice/recorder';
import type { LearningScope } from './learning-request';
import { createVoiceInput, type VoiceOptions, type VoiceState } from './voice-input';
import { voiceReadiness } from './voice-readiness';

const alone = () => () => {};

// Speech for one step: the child speaks, held or listened for as `mode`
// says, reads and corrects what was heard, and only a confirmed text is
// handed on. Nothing heard, a refused microphone or a failed request never
// counts as a mistake. `blocked` tells while someone else in the lesson is
// speaking. A reload waits while the child speaks and until what was heard
// is confirmed.
export function useVoiceInput(
  scope: LearningScope,
  stepId: string,
  mode: RecordingMode,
  options: VoiceOptions,
) {
  const [state, setState] = useState<VoiceState>({ status: 'idle' });
  const [voice] = useState(() => createVoiceInput(setState, options));
  useEffect(() => () => voice.dispose(), [voice]);
  useReloadReadiness(voiceReadiness(state));
  const blocked = useSyncExternalStore(options.turn?.subscribe ?? alone, voice.blocked);
  return {
    state,
    blocked,
    start: () => voice.start(scope, stepId, mode),
    release: voice.release,
    cancel: voice.cancel,
    guide: voice.guide,
    edit: voice.edit,
    confirm: voice.confirm,
  };
}
