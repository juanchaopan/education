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

type Clip = { step: string; source: string };
type Active = Clip & { cue: ReturnType<typeof createCue>; extra: boolean };
type Playing = { active?: Active; last?: Clip };
type Options = {
  createAudio?: () => HTMLAudioElement;
  onStatus?: (status: NarrationStatus) => void;
};

function idleStatus(last: Clip | undefined): NarrationStatus {
  return last ? 'ready' : 'silent';
}

// What the child does with the cue on screen: hear it again, pause it,
// continue it; and what the scene does on leaving: stop it.
function childControls(
  playing: Playing,
  begin: (clip: Clip) => void,
  onStatus: (status: NarrationStatus) => void,
) {
  return {
    replay() {
      if (playing.active) {
        onStatus('playing');
        playing.active.cue.restart();
      } else if (playing.last) begin(playing.last);
    },
    pause() {
      if (!playing.active) return;
      playing.active.cue.pause();
      onStatus('paused');
    },
    resume() {
      if (!playing.active) return;
      onStatus('playing');
      playing.active.cue.resume();
    },
    stop() {
      playing.last = undefined;
      if (playing.active) playing.active.cue.stop();
      else onStatus('silent');
    },
  };
}

// Every cue belongs to a step. Within a step the scene owns cue order: while one
// of its cues plays, another cannot replace or queue behind it, unless the
// scene interrupts it because the child just changed what is on screen. A cue
// for a different step replaces whatever an earlier step was saying. Hearing a
// cue again is the child's own request: it restarts the cue in place, or
// replays the last one once it has ended, and the scene's next cue takes over
// from such a replay.
export function createNarration({
  createAudio = () => new Audio(),
  onStatus = () => {},
}: Options = {}) {
  const playing: Playing = {};

  function begin(clip: Clip, onCue: (() => void) | undefined, extra: boolean) {
    return new Promise<CueResult>((resolve) => {
      const audio = createAudio();
      const cue = createCue(audio, onCue, (result) => {
        if (playing.active?.cue === cue) playing.active = undefined;
        onStatus(result === 'unavailable' ? 'failed' : idleStatus(playing.last));
        resolve(result);
      });
      playing.active = { ...clip, cue, extra };
      audio.src = clip.source;
      onStatus('playing');
      cue.start();
    });
  }

  function interrupt(step: string, source?: string, onCue?: () => void): Promise<CueResult> {
    playing.last = source ? { step, source } : undefined;
    playing.active?.cue.stop();
    if (playing.last) return begin(playing.last, onCue, false);
    onStatus('silent');
    onCue?.();
    return Promise.resolve('unavailable');
  }

  return {
    play(step: string, source?: string, onCue?: () => void): Promise<CueResult> {
      if (playing.active?.step === step && !playing.active.extra) return Promise.resolve('busy');
      return interrupt(step, source, onCue);
    },
    interrupt,
    // Forgets every cue that does not belong to the step on screen.
    keep(step: string) {
      if (playing.last?.step !== step) playing.last = undefined;
      if (playing.active && playing.active.step !== step) playing.active.cue.stop();
      else if (!playing.active) onStatus(idleStatus(playing.last));
    },
    ...childControls(playing, (clip) => void begin(clip, undefined, true), onStatus),
  };
}
