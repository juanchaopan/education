import { useEffect, useState } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';
import type { useVoiceInput } from '../data-access/useVoiceInput';
import { usesMicrophone } from '../voice/microphone-turn';
import { chimeMs, type Chime } from './chime';
import type { NarrationFailure } from './narration';

// The teacher's voice, which the microphone never listens over, and the
// lesson's tones and audio context, which the listening uses.
export type ListeningFilm = {
  telling: boolean;
  speaking: boolean;
  failure?: NarrationFailure;
  chime: Pick<Chime, 'play' | 'audio'>;
};

// The short rising cue that tells the child the microphone is open. The
// microphone opens once it has sounded, so it is not heard as speech.
const listenTones = [523, 784];

// Opens the microphone by itself when the child is meant to speak, `open`:
// once the teacher has finished speaking, or a line could not be heard, and
// no one else is using the microphone, after a short cue. That happens when
// the scene that asks opens and whenever the child asks to speak again. A
// line the teacher says again stops the listening, so the two never overlap.
// `awaiting` tells that the microphone is about to open by itself.
export function useListening(
  voice: ReturnType<typeof useVoiceInput>,
  film: ListeningFilm,
  open: boolean,
) {
  const [wanted, setWanted] = useState(true);
  const latest = useLatest(voice);
  const { chime } = film;
  const quiet = !film.speaking && (!film.telling || film.failure !== undefined);
  const listening = usesMicrophone(voice.state.status);
  const ready = wanted && open && quiet && !voice.blocked;
  useEffect(() => {
    if (!ready) return;
    chime.play(listenTones);
    const timer = setTimeout(() => {
      if (latest.current.start()) setWanted(false);
    }, chimeMs(listenTones));
    return () => clearTimeout(timer);
  }, [ready, chime, latest]);
  useEffect(() => {
    if (!quiet && listening) latest.current.cancel();
  }, [quiet, listening, latest]);
  return { awaiting: wanted && open, listenAgain: () => setWanted(true) };
}
