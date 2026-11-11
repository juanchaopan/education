import { useEffect, useState } from 'react';
import { createNarration, type NarrationFailure, type NarrationStatus } from './narration';

type Heard = Readonly<{ status: NarrationStatus; failure?: NarrationFailure }>;

// Narration for one scene. Once another step is on screen, whatever an earlier
// step was saying stops and is forgotten; a cue the scene has already started
// for the new step keeps playing. Hiding the page pauses the cue until the
// child continues, and closing the lesson stops it. While a recording does not
// come out, its kind is known as the failure. A report that changes nothing
// leaves the lesson as it is drawn. `muted` plays the lines without sound.
export function useNarration(stepId: string, createAudio?: () => HTMLAudioElement, muted = false) {
  const [heard, setHeard] = useState<Heard>({ status: 'silent' });
  const [narration] = useState(() =>
    createNarration({
      createAudio,
      onStatus: (status, failure) =>
        setHeard((last) =>
          last.status === status && last.failure === failure ? last : { status, failure },
        ),
    }),
  );

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') narration.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      narration.close();
    };
  }, [narration]);

  useEffect(() => narration.keep(stepId), [narration, stepId]);
  useEffect(() => narration.mute(muted), [narration, muted]);

  return { ...narration, ...heard };
}
