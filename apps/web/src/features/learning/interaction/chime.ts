// Short sine tones that mark a scene's events, such as an object landing or a
// scale settling. One audio context serves the whole lesson and is closed when
// the lesson closes; a browser without Web Audio, or one that refuses to start
// it, simply stays quiet.
export function createChime() {
  let context: AudioContext | undefined;
  return {
    play(notes: readonly number[]) {
      if (!notes.length) return;
      try {
        const audio = (context ??= new AudioContext());
        void audio.resume();
        notes.forEach((frequency, index) => {
          const start = audio.currentTime + index * 0.085;
          const tone = audio.createOscillator();
          const volume = audio.createGain();
          tone.type = 'sine';
          tone.frequency.value = frequency;
          volume.gain.setValueAtTime(0.032, start);
          volume.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
          tone.connect(volume).connect(audio.destination);
          tone.start(start);
          tone.stop(start + 0.19);
        });
      } catch {
        // Sound effects are decoration; the scene goes on without them.
      }
    },
    close() {
      void context?.close().catch(() => {});
      context = undefined;
    },
  };
}
