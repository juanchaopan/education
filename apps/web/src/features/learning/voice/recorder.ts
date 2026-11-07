import {
  transcriptionAudioBitsPerSecond,
  transcriptionMaxSeconds,
  type TranscriptionFormat,
} from '@education/contracts';

export type RecorderFailure = 'unsupported' | 'denied' | 'interrupted' | 'empty';
export type Recording = { audio: Blob; format: TranscriptionFormat };
type Events = {
  onStart(): void;
  onStop(recording: Recording): void;
  onFail(reason: RecorderFailure): void;
};
export type RecorderHost = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  Recorder?: typeof MediaRecorder;
  document: Document;
};
// How a recording ends: kept for transcription, dropped by the child, or lost.
type Ending = 'keep' | 'discard' | RecorderFailure;
type Outcome = Recording | RecorderFailure | undefined;
type Choice = (typeof candidates)[number];
type Microphone = { stream: MediaStream; Recorder: typeof MediaRecorder; choice: Choice };

// WebM/Opus where the browser records it, otherwise MP4/AAC as Safari does.
const candidates = [
  { mimeType: 'audio/webm;codecs=opus', format: 'webm' },
  { mimeType: 'audio/webm', format: 'webm' },
  { mimeType: 'audio/mp4', format: 'mp4' },
] as const;

export function recordingFormat(Recorder: Pick<typeof MediaRecorder, 'isTypeSupported'>) {
  return candidates.find(({ mimeType }) => Recorder.isTypeSupported(mimeType));
}

function browserHost(): RecorderHost {
  const devices = globalThis.navigator?.mediaDevices;
  return {
    getUserMedia: devices?.getUserMedia
      ? (constraints) => devices.getUserMedia(constraints)
      : undefined,
    Recorder: globalThis.MediaRecorder,
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

function outcome(ending: Ending, chunks: Blob[], recorder: MediaRecorder, choice: Choice): Outcome {
  if (ending !== 'keep') return ending === 'discard' ? undefined : ending;
  const audio = new Blob(chunks, { type: recorder.mimeType || choice.mimeType });
  return audio.size ? { audio, format: choice.format } : 'empty';
}

// Records until stopped, the time limit, the page being hidden, the track
// ending or a recorder error. The microphone is released as soon as it ends.
function record(
  host: RecorderHost,
  { stream, Recorder, choice }: Microphone,
  done: (result: Outcome) => void,
) {
  const recorder = new Recorder(stream, {
    mimeType: choice.mimeType,
    audioBitsPerSecond: transcriptionAudioBitsPerSecond,
  });
  const chunks: Blob[] = [];
  let ending: Ending = 'keep';
  const hidden = () => {
    if (host.document.hidden) end('interrupted');
  };
  const timer = setTimeout(() => end('keep'), transcriptionMaxSeconds * 1000);
  function end(how: Ending) {
    ending = how;
    clearTimeout(timer);
    if (recorder.state !== 'inactive') recorder.stop();
    release(stream);
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onerror = () => end('interrupted');
  recorder.onstop = () => {
    host.document.removeEventListener('visibilitychange', hidden);
    done(outcome(ending, chunks, recorder, choice));
  };
  stream
    .getAudioTracks()
    .forEach((track) => track.addEventListener('ended', () => end('interrupted'), { once: true }));
  host.document.addEventListener('visibilitychange', hidden);
  recorder.start();
  return { end };
}

// One short recording at a time, started only by the child. Stopping keeps it
// for transcription; cancelling, leaving the page, losing the microphone or a
// recorder error drops it. The audio exists only in memory until it is handed on.
export function createVoiceRecorder(events: Events, host: RecorderHost = browserHost()) {
  let session: ReturnType<typeof record> | undefined;
  let opening: { cancelled: boolean } | undefined;

  function report(result: Outcome) {
    session = undefined;
    if (typeof result === 'string') events.onFail(result);
    else if (result) events.onStop(result);
  }

  return {
    async start() {
      if (session || opening) return;
      const request = { cancelled: false };
      opening = request;
      const microphone = await openMicrophone(host).finally(() => {
        opening = undefined;
      });
      if (typeof microphone === 'string') return events.onFail(microphone);
      if (request.cancelled) return release(microphone.stream);
      session = record(host, microphone, report);
      events.onStart();
    },
    stop: () => session?.end('keep'),
    cancel() {
      if (opening) opening.cancelled = true;
      session?.end('discard');
    },
  };
}

export type VoiceRecorder = ReturnType<typeof createVoiceRecorder>;
