type PlaybackResult = 'ended' | 'unavailable';
type CueResult = PlaybackResult | 'cancelled' | 'busy';

function createCue(
  audio: HTMLAudioElement,
  onCue: (() => void) | undefined,
  onFinish: (result: CueResult) => void,
) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let paused = false;
  let deferred: PlaybackResult | undefined;
  let playback = 0;

  function reveal() {
    const cue = onCue;
    onCue = undefined;
    cue?.();
  }

  function finish(result: CueResult) {
    if (listeners.signal.aborted) return;
    listeners.abort();
    onFinish(result);
    if (result !== 'cancelled') reveal();
  }

  function playbackResult(result: PlaybackResult) {
    if (paused) deferred = result;
    else finish(result);
  }

  function start() {
    const request = ++playback;
    void audio.play().catch(() => {
      if (request === playback) playbackResult('unavailable');
    });
  }

  audio.addEventListener(
    'playing',
    () => {
      if (!paused) reveal();
    },
    options,
  );
  audio.addEventListener('ended', () => playbackResult('ended'), options);
  audio.addEventListener('error', () => playbackResult('unavailable'), options);

  return {
    start,
    pause() {
      if (paused) return;
      paused = true;
      playback++;
      audio.pause();
    },
    resume() {
      if (!paused) return;
      paused = false;
      if (deferred) finish(deferred);
      else start();
    },
    stop() {
      finish('cancelled');
      audio.pause();
    },
  };
}

export function createNarration(createAudio = () => new Audio()) {
  let active: ReturnType<typeof createCue> | undefined;

  // The scene owns cue order. Repeated input cannot replace or queue another clip.
  function play(source: string | undefined, onCue?: () => void): Promise<CueResult> {
    if (active) return Promise.resolve('busy');
    if (!source) {
      onCue?.();
      return Promise.resolve('unavailable');
    }

    return new Promise((resolve) => {
      const audio = createAudio();
      const cue = createCue(audio, onCue, (result) => {
        active = undefined;
        resolve(result);
      });
      active = cue;
      audio.src = source;
      cue.start();
    });
  }

  return {
    play,
    pause: () => active?.pause(),
    resume: () => active?.resume(),
    stop: () => active?.stop(),
  };
}
