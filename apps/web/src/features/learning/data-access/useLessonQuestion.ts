import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { RecorderHost } from '../voice/recorder';
import type { LearningScope } from './learning-request';
import { useTeachingFeedback } from './useTeachingFeedback';
import { createVoiceInput, type VoiceState } from './voice-input';

// A question the child asks out loud in the middle of a scene. What was heard
// goes to the teacher straight away, about the scene it was asked in: a
// question is not an answer, so there is nothing to confirm and nothing is
// recorded as an attempt.
export function useLessonQuestion(scope: LearningScope, stepId: string, host?: RecorderHost) {
  const [voice, setVoice] = useState<VoiceState>({ status: 'idle' });
  const feedback = useTeachingFeedback(scope);
  const askedIn = useRef(stepId);
  const ask = useEffectEvent((text: string) => {
    void feedback.ask({ stepId: askedIn.current, text, drawing: [] });
  });
  const [input] = useState(() =>
    createVoiceInput(setVoice, { host, onHeard: (text) => ask(text) }),
  );
  useEffect(() => () => input.dispose(), [input]);

  return {
    voice,
    reply: feedback.state,
    start() {
      askedIn.current = stepId;
      input.start(scope, stepId);
    },
    stop: input.stop,
    cancel: input.cancel,
    guide() {
      input.guide();
      feedback.guide();
    },
  };
}
