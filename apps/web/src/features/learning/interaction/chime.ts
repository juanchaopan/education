const noteGap = 0.085;
const noteLength = 0.19;

// How long a run of notes sounds, in milliseconds.
export function chimeMs(notes: readonly number[]) {
  return notes.length ? ((notes.length - 1) * noteGap + noteLength) * 1000 : 0;
}

// Short sine tones that mark a scene's events, such as an object landing or a
// scale settling. One audio context serves the whole lesson, its tones and
// whatever else listens through Web Audio, and is closed when the lesson
// closes; a browser without Web Audio, or one that refuses to start it,
// simply stays quiet.
export function createChime() {
  let context: AudioContext | undefined;
  function audio() {
    try {
      context ??= new AudioContext();
      void context.resume();
      return context;
    } catch {
      return undefined;
    }
  }
  return {
    play(notes: readonly number[]) {
      const sound = notes.length ? audio() : undefined;
      if (!sound) return;
      try {
        notes.forEach((frequency, index) => {
          const start = sound.currentTime + index * noteGap;
          const tone = sound.createOscillator();
          const volume = sound.createGain();
          tone.type = 'sine';
          tone.frequency.value = frequency;
          volume.gain.setValueAtTime(0.032, start);
          volume.gain.exponentialRampToValueAtTime(0.001, start + noteLength - 0.01);
          tone.connect(volume).connect(sound.destination);
          tone.start(start);
          tone.stop(start + noteLength);
        });
      } catch {
        // Sound effects are decoration; the scene goes on without them.
      }
    },
    // The lesson's audio context, started by the child's first tap.
    audio,
    close() {
      void context?.close().catch(() => {});
      context = undefined;
    },
  };
}

export type Chime = ReturnType<typeof createChime>;
