import {
  transcriptionAudioBitsPerSecond,
  transcriptionMaxSeconds,
  type TranscriptionFormat,
} from '@education/contracts';
import { browserMeter, createListening, type Meter } from './listening';

// Why a recording gave nothing to hear: no recording on this device, no
// permission, a recorder that broke off, no audio, a recording too short to
// hold a word, or nobody speaking while the microphone listened.
export type RecorderFailure =
  'unsupported' | 'denied' | 'interrupted' | 'empty' | 'short' | 'quiet';
export type Recording = { audio: Blob; format: TranscriptionFormat };
// How a recording is ended: by the child letting go of the button, or, when
// the microphone listens on its own, by the child falling quiet after speaking.
export type RecordingMode = 'hold' | 'listen';
// How loud the microphone is while it records, from 0 to about 1.
export type Loudness = () => number;
type Events = {
  // `level` reads the microphone while it records, where it can be measured.
  onStart(level?: Loudness): void;
  onStop(recording: Recording): void;
  onFail(reason: RecorderFailure): void;
};
export type RecorderHost = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  Recorder?: typeof MediaRecorder;
  meter?: (stream: MediaStream) => Meter | undefined;
  now?: () => number;
  document: Document;
};
// How a recording ends: kept for transcription, dropped by the child, or lost.
type Ending = 'keep' | 'discard' | 'quiet' | 'interrupted' | 'unsupported';
type Outcome = Recording | RecorderFailure | undefined;
type Choice = (typeof candidates)[number];
type Microphone = { stream: MediaStream; Recorder: typeof MediaRecorder; choice: Choice };

// Anything shorter cannot hold a spoken word, so it is not sent.
const shortestRecordingMs = 500;
// How often a listening microphone checks whether the child has finished.
const listenEveryMs = 100;

// WebM/Opus where the browser records it, otherwise MP4/AAC as Safari does.
const candidates = [
  { mimeType: 'audio/webm;codecs=opus', format: 'webm' },
  { mimeType: 'audio/webm', format: 'webm' },
  { mimeType: 'audio/mp4', format: 'mp4' },
] as const;

export function recordingFormat(Recorder: Pick<typeof MediaRecorder, 'isTypeSupported'>) {
  return candidates.find(({ mimeType }) => Recorder.isTypeSupported(mimeType));
}

// The browser's microphone and recorder. Listening is measured on `audio`,
// the lesson's audio context, when there is one.
export function browserHost(audio?: () => AudioContext | undefined): RecorderHost {
  const devices = globalThis.navigator?.mediaDevices;
  return {
    getUserMedia: devices?.getUserMedia
      ? (constraints) => devices.getUserMedia(constraints)
      : undefined,
    Recorder: globalThis.MediaRecorder,
    meter: (stream) => browserMeter(audio?.(), stream),
    now: () => performance.now(),
    document,
  };
}

function release(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function permissionFailure(error: unknown): RecorderFailure {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unsupported';
}

async function openMicrophone(host: RecorderHost): Promise<Microphone | RecorderFailure> {
  const { getUserMedia, Recorder } = host;
  const choice = Recorder && recordingFormat(Recorder);
  if (!getUserMedia || !Recorder || !choice) return 'unsupported';
  try {
    const stream = await getUserMedia({ audio: true });
    if (!host.document.hidden) return { stream, Recorder, choice };
    release(stream);
    return 'interrupted';
  } catch (error) {
    return permissionFailure(error);
  }
}

function createRecorder({ stream, Recorder, choice }: Microphone) {
  try {
    return new Recorder(stream, {
      mimeType: choice.mimeType,
      audioBitsPerSecond: transcriptionAudioBitsPerSecond,
    });
  } catch {
    return undefined;
  }
}

// Ends a listening recording once the child has spoken and fallen quiet, or
// when nobody speaks. Returns how to stop listening.
function listenFor(meter: Meter | undefined, now: () => number, end: (how: Ending) => void) {
  if (!meter) return () => {};
  const heard = createListening(now());
  const timer = setInterval(() => {
    const result = heard(meter.level(), now());
    if (result !== 'listening') end(result === 'spoken' ? 'keep' : 'quiet');
  }, listenEveryMs);
  return () => clearInterval(timer);
}

function outcome(
  ending: Ending,
  length: number,
  chunks: Blob[],
  recorder: MediaRecorder,
  choice: Choice,
): Outcome {
  if (ending === 'discard') return undefined;
  if (ending !== 'keep') return ending;
  if (length < shortestRecordingMs) return 'short';
  const audio = new Blob(chunks, { type: recorder.mimeType || choice.mimeType });
  return audio.size ? { audio, format: choice.format } : 'empty';
}

// Records until the child stops, the time limit, or, when listening, the
// child falling quiet. The page being hidden or the microphone going away
// also ends it: a recording the child holds keeps what was said, as letting
// go does, while one the page listened for on its own is dropped, as the
// child may have left before saying anything. A recorder error loses it. The
// first of these decides the outcome, and the microphone is released as soon
// as it happens. Returns nothing, with the microphone released, when the
// browser refuses to record in the chosen format; otherwise how to end it and
// how loud the microphone is, where it can be measured.
function record(
  host: RecorderHost,
  microphone: Microphone,
  mode: RecordingMode,
  done: (result: Outcome) => void,
) {
  const recorder = createRecorder(microphone);
  if (!recorder) {
    release(microphone.stream);
    return;
  }
  const now = host.now ?? Date.now;
  const chunks: Blob[] = [];
  const listeners = new AbortController();
  const startedAt = now();
  const leaving: Ending = mode === 'hold' ? 'keep' : 'interrupted';
  const meter = host.meter?.(microphone.stream);
  let ending: Ending | undefined;
  let length = 0;
  const end = (how: Ending) => {
    if (ending) return;
    ending = how;
    length = now() - startedAt;
    clearTimeout(timer);
    stopListening();
    meter?.close();
    listeners.abort();
    if (recorder.state !== 'inactive') recorder.stop();
    release(microphone.stream);
  };
  const timer = setTimeout(() => end('keep'), transcriptionMaxSeconds * 1000);
  const stopListening = mode === 'listen' ? listenFor(meter, now, end) : () => {};
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onerror = () => end('interrupted');
  recorder.onstop = () => {
    end('interrupted');
    done(outcome(ending ?? 'interrupted', length, chunks, recorder, microphone.choice));
  };
  const { signal } = listeners;
  for (const track of microphone.stream.getAudioTracks())
    track.addEventListener('ended', () => end(leaving), { signal });
  const hidden = () => {
    if (host.document.hidden) end(leaving);
  };
  host.document.addEventListener('visibilitychange', hidden, { signal });
  try {
    recorder.start();
  } catch {
    end('unsupported');
    return;
  }
  return { end, level: meter && (() => (ending ? 0 : meter.level())) };
}

// One short recording at a time, started by the child or by a page that has
// just asked the child a question out loud. Stopping keeps it for
// transcription, and stopping before the microphone has opened is too short
// to hold anything; cancelling drops it. A start that was stopped or
// cancelled ends silently, and the audio exists only in memory until it is
// handed on.
export function createVoiceRecorder(events: Events, host: RecorderHost = browserHost()) {
  let session: ReturnType<typeof record>;
  let opening: { cancelled: boolean } | undefined;

  function report(result: Outcome) {
    session = undefined;
    if (typeof result === 'string') events.onFail(result);
    else if (result) events.onStop(result);
  }

  function cancelOpening() {
    if (!opening || opening.cancelled) return false;
    opening.cancelled = true;
    return true;
  }

  return {
    async start(mode: RecordingMode) {
      if (session || (opening && !opening.cancelled)) return;
      const request = { cancelled: false };
      opening = request;
      const microphone = await openMicrophone(host);
      if (opening === request) opening = undefined;
      if (request.cancelled) {
        if (typeof microphone !== 'string') release(microphone.stream);
        return;
      }
      if (typeof microphone === 'string') return events.onFail(microphone);
      session = record(host, microphone, mode, report);
      if (session) events.onStart(session.level);
      else events.onFail('unsupported');
    },
    stop() {
      if (cancelOpening()) events.onFail('short');
      else session?.end('keep');
    },
    cancel() {
      cancelOpening();
      session?.end('discard');
    },
  };
}
