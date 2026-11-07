import { useEffect, useState } from 'react';
import { createNarration, type NarrationStatus } from './narration';

// Narration for one scene. Once another step is on screen, whatever an earlier
// step was saying stops and is forgotten; a cue the scene has already started
// for the new step keeps playing. Hiding the page pauses the cue until the
// child continues, and closing the lesson stops it.
export function useNarration(stepId: string, createAudio?: () => HTMLAudioElement) {
  const [status, setStatus] = useState<NarrationStatus>('silent');
  const [narration] = useState(() => createNarration({ createAudio, onStatus: setStatus }));

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') narration.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      narration.stop();
    };
  }, [narration]);

  useEffect(() => narration.keep(stepId), [narration, stepId]);

  return { ...narration, status };
}
