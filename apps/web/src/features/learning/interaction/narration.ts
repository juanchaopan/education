type PlaybackResult = 'ended' | 'unavailable';
export type CueResult = PlaybackResult | 'cancelled' | 'busy';
// What the child can do with the current cue: nothing to hear, hear it again,
// pause it, continue it, or try again after the sound did not come out.
export type NarrationStatus = 'silent' | 'ready' | 'playing' | 'paused' | 'failed';

function once(action: (() => void) | undefined) {
  let pending = action;
  return () => {
    const run = pending;
    pending = undefined;
    run?.();
  };
}

function listen(
  audio: HTMLAudioElement,
  signal: AbortSignal,
  on: { playing: () => void; result: (result: PlaybackResult) => void },
) {
  audio.addEventListener('playing', on.playing, { signal });
  audio.addEventListener('ended', () => on.result('ended'), { signal });
  audio.addEventListener('error', () => on.result('unavailable'), { signal });
}

function createCue(
  audio: HTMLAudioElement,
  onCue: (() => void) | undefined,
  onFinish: (result: CueResult) => void,
) {
  const listeners = new AbortController();
  const reveal = once(onCue);
  let paused = false;
  let deferred: PlaybackResult | undefined;
  let playback = 0;

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

  listen(audio, listeners.signal, {
    playing: () => {
      if (!paused) reveal();
    },
    result: playbackResult,
  });

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
    // The same clip from its beginning, on the same element, so two copies never overlap.
    restart() {
      paused = false;
      deferred = undefined;
      audio.currentTime = 0;
      start();
    },
    stop() {
      finish('cancelled');
      audio.pause();
    },
  };
}

type Active = { cue: ReturnType<typeof createCue>; extra: boolean };
type Options = {
  createAudio?: () => HTMLAudioElement;
  onStatus?: (status: NarrationStatus) => void;
};

// The scene owns cue order: while one of its cues plays, another cannot replace
// or queue behind it. Hearing a cue again is the child's own request: it
// restarts the cue in place, or replays the last one once it has ended, and the
// scene's next cue takes over from such a replay.
export function createNarration({
  createAudio = () => new Audio(),
  onStatus = () => {},
}: Options = {}) {
  let active: Active | undefined;
  let last: string | undefined;

  function begin(source: string, onCue: (() => void) | undefined, extra: boolean) {
    return new Promise<CueResult>((resolve) => {
      const audio = createAudio();
      const cue = createCue(audio, onCue, (result) => {
        if (active?.cue === cue) active = undefined;
        if (result === 'unavailable') onStatus('failed');
        else onStatus(last ? 'ready' : 'silent');
        resolve(result);
      });
      active = { cue, extra };
      audio.src = source;
      onStatus('playing');
      cue.start();
    });
  }

  function play(source: string | undefined, onCue?: () => void): Promise<CueResult> {
    if (active && !active.extra) return Promise.resolve('busy');
    last = source;
    active?.cue.stop();
    if (source) return begin(source, onCue, false);
    onStatus('silent');
    onCue?.();
    return Promise.resolve('unavailable');
  }

  return {
    play,
    replay() {
      if (active) {
        onStatus('playing');
        active.cue.restart();
      } else if (last) void begin(last, undefined, true);
    },
    pause() {
      if (!active) return;
      active.cue.pause();
      onStatus('paused');
    },
    resume() {
      if (!active) return;
      onStatus('playing');
      active.cue.resume();
    },
    // Leaving the cue also forgets it, so a later step never replays an earlier one.
    stop() {
      last = undefined;
      if (active) active.cue.stop();
      else onStatus('silent');
    },
  };
}
