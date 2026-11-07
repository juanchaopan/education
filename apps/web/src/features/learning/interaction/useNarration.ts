import { useEffect, useState } from 'react';
import { createNarration, type NarrationStatus } from './narration';

export type { NarrationStatus } from './narration';

// Narration for one scene. Moving to another step stops whatever the previous
// step was saying and forgets it, hiding the page pauses the cue until the
// child continues, and closing the lesson stops it.
export function useNarration(stepId: string, createAudio?: () => HTMLAudioElement) {
  const [status, setStatus] = useState<NarrationStatus>('silent');
  const [narration] = useState(() => createNarration({ createAudio, onStatus: setStatus }));

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') narration.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [narration]);

  useEffect(() => () => narration.stop(), [narration, stepId]);

  return { ...narration, status };
}
