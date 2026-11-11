// A cue ends only when its recording is heard to its end, or when the scene
// replaces or stops it.
export type CueResult = 'ended' | 'cancelled';
// Why a recording did not come out: the browser refused to play it, it never
// started playing, the device could not decode it, or the system stopped it
// partway, as an incoming call does.
export type NarrationFailure = 'refused' | 'stalled' | 'undecodable' | 'interrupted';
// What the child can do with the current cue: nothing to hear, hear it again,
// pause it, continue it, or hear it again after the sound did not come out.
export type NarrationStatus = 'silent' | 'ready' | 'playing' | 'paused' | 'failed';

// A recording that has not started playing by then, such as a stalled
// download, counts as not coming out. A paused one is never stalled.
const longestStall = 11_000;
const networkError = 2;

function refusal(error: unknown): NarrationFailure {
  if (!(error instanceof DOMException)) return 'undecodable';
  if (error.name === 'NotAllowedError') return 'refused';
  return error.name === 'AbortError' ? 'interrupted' : 'undecodable';
}

function mediaFailure(audio: HTMLAudioElement): NarrationFailure {
  return audio.error?.code === networkError ? 'stalled' : 'undecodable';
}

type CueEvents = {
  onFail: (failure: NarrationFailure) => void;
  onFinish: (result: CueResult) => void;
};

// One recording playing on the lesson's player, from the first request to its
// end. Halting it stops the sound and lets go of any request still pending,
// so a late refusal of that request is not taken for a failure. While it is
// sounding it needs no stall check, and a pause the cue did not make, other
// than the one every recording makes as it ends, means the system stopped it.
// What happens while the child has it paused waits until they continue.
function createPlayback(audio: HTMLAudioElement, { onFail, onFinish }: CueEvents) {
  const listeners = new AbortController();
  const state = {
    paused: false,
    failed: false,
    sounding: false,
    deferred: undefined as (() => void) | undefined,
    request: 0,
    stall: undefined as ReturnType<typeof setTimeout> | undefined,
  };
  const settle = () => clearTimeout(state.stall);

  function halt() {
    settle();
    state.sounding = false;
    state.request++;
    audio.pause();
  }

  function finish(result: CueResult) {
    if (listeners.signal.aborted) return;
    settle();
    listeners.abort();
    onFinish(result);
  }

  function fail(failure: NarrationFailure) {
    if (listeners.signal.aborted || state.failed) return;
    state.failed = true;
    halt();
    onFail(failure);
  }

  const outcome = (apply: () => void) => {
    if (state.paused) state.deferred = apply;
    else apply();
  };

  function start() {
    const request = ++state.request;
    settle();
    if (!state.sounding) state.stall = setTimeout(() => fail('stalled'), longestStall);
    void audio.play().catch((error: unknown) => {
      if (request === state.request) outcome(() => fail(refusal(error)));
    });
  }

  const { signal } = listeners;
  const sound = () => {
    state.sounding = true;
    settle();
  };
  const stopped = () => {
    if (state.sounding && !audio.ended) fail('interrupted');
  };
  audio.addEventListener('playing', sound, { signal });
  audio.addEventListener('pause', stopped, { signal });
  audio.addEventListener('ended', () => outcome(() => finish('ended')), { signal });
  audio.addEventListener('error', () => outcome(() => fail(mediaFailure(audio))), { signal });
  return { state, halt, start, finish };
}

// A recording that does not come out keeps its cue open, so hearing it again
// continues the scene from there. Pausing and continuing tell whether they
// changed anything: a cue that did not come out waits to be heard again.
function createCue(audio: HTMLAudioElement, events: CueEvents) {
  const { state, halt, start, finish } = createPlayback(audio, events);
  return {
    start,
    pause() {
      if (state.paused || state.failed) return false;
      state.paused = true;
      halt();
      return true;
    },
    resume(onResume: () => void) {
      if (!state.paused) return;
      state.paused = false;
      onResume();
      const apply = state.deferred;
      state.deferred = undefined;
      if (apply) apply();
      else start();
    },
    // The same recording from its beginning on the same player, so two copies
    // never overlap. One that did not come out is loaded again first.
    restart() {
      state.paused = false;
      state.deferred = undefined;
      if (state.failed) audio.load();
      else audio.currentTime = 0;
      state.failed = false;
      start();
    },
    stop() {
      finish('cancelled');
      audio.pause();
    },
  };
}

type Clip = { step: string; source: string };
type Active = Clip & { cue: ReturnType<typeof createCue> };
type Playing = { active?: Active; last?: Clip };
type Options = {
  createAudio?: () => HTMLAudioElement;
  onStatus?: (status: NarrationStatus, failure?: NarrationFailure) => void;
};

function idleStatus(last: Clip | undefined): NarrationStatus {
  return last ? 'ready' : 'silent';
}

// What the child does with the cue on screen: hear it again, pause it,
// continue it.
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
      if (playing.active?.cue.pause()) onStatus('paused');
    },
    resume() {
      playing.active?.cue.resume(() => onStatus('playing'));
    },
  };
}

// A lesson's narration on one player: the child's tap that starts the film
// lets it make sound, and every line plays on it. Every cue belongs to a step:
// a new cue cuts in on whatever was still being said, and once another step is
// on screen an earlier step's cue stops and is forgotten. Hearing a cue again
// restarts it in place, or replays the last one once it has ended. A recording
// that does not come out is reported, stays for the child to hear again, and
// is noted in the console with its kind. With the sound off the player plays
// on muted, so every line still ends when it would and the film moves on.
export function createNarration({
  createAudio = () => new Audio(),
  onStatus = () => {},
}: Options = {}) {
  const playing: Playing = {};
  let player: HTMLAudioElement | undefined;
  let muted = false;

  function begin(clip: Clip) {
    return new Promise<CueResult>((resolve) => {
      player ??= Object.assign(createAudio(), { muted });
      const audio = player;
      const cue = createCue(audio, {
        onFail(failure) {
          console.warn('Narration did not play', { clip: clip.source, failure });
          onStatus('failed', failure);
        },
        onFinish(result) {
          if (playing.active?.cue === cue) playing.active = undefined;
          if (result === 'ended') onStatus(idleStatus(playing.last));
          resolve(result);
        },
      });
      playing.active = { ...clip, cue };
      audio.src = clip.source;
      onStatus('playing');
      cue.start();
    });
  }

  const stopActive = () => playing.active?.cue.stop();

  return {
    interrupt(step: string, source: string): Promise<CueResult> {
      playing.last = { step, source };
      stopActive();
      return begin(playing.last);
    },
    // Forgets every cue that does not belong to the step on screen.
    keep(step: string) {
      if (playing.last?.step !== step) playing.last = undefined;
      if (playing.active && playing.active.step !== step) stopActive();
      if (!playing.active) onStatus(idleStatus(playing.last));
    },
    // Turns the teacher's voice off or on, for this line and every later one.
    mute(silent: boolean) {
      muted = silent;
      if (player) player.muted = silent;
    },
    // Leaving the lesson: whatever was still being said stops.
    close() {
      playing.last = undefined;
      stopActive();
      onStatus('silent');
    },
    ...childControls(playing, (clip) => void begin(clip), onStatus),
  };
}
