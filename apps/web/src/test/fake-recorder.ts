import { vi } from 'vitest';
import type { RecorderHost } from '../features/learning/voice/recorder';

// Test doubles for the browser's microphone and MediaRecorder. Stopping the
// fake recorder delivers one short chunk and then the stop event, as a real
// recorder does; `deferStop` holds the stop event back as real browsers do.
export class FakeTrack extends EventTarget {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

export class FakeRecorder {
  static supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  static last: FakeRecorder | undefined;
  static refuse = false;
  static isTypeSupported(type: string) {
    return FakeRecorder.supported.includes(type);
  }
  static reset() {
    FakeRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    FakeRecorder.last = undefined;
    FakeRecorder.refuse = false;
  }
  state: RecordingState = 'inactive';
  deferStop = false;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;
  readonly stream: MediaStream;
  readonly options: MediaRecorderOptions;
  constructor(stream: MediaStream, options: MediaRecorderOptions) {
    if (FakeRecorder.refuse) throw new DOMException('refused', 'NotSupportedError');
    this.stream = stream;
    this.options = options;
    FakeRecorder.last = this;
  }
  get mimeType() {
    return this.options.mimeType ?? '';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) });
    if (!this.deferStop) this.onstop?.();
  }
}

// A microphone, its page and its clock. Each reading of the clock moves it on
// by `clock.step` milliseconds, a second unless a test makes recordings
// shorter; `sound.level` is how loud the room is.
export function fakeMicrophone(getUserMedia?: RecorderHost['getUserMedia']) {
  const track = new FakeTrack();
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  const document = Object.assign(new EventTarget(), { hidden: false }) as unknown as Document;
  const clock = { time: 0, step: 1000 };
  const sound = { level: 0, closed: false };
  const host: RecorderHost = {
    getUserMedia: getUserMedia ?? vi.fn(async () => stream),
    Recorder: FakeRecorder as unknown as typeof MediaRecorder,
    meter: () => ({
      level: () => sound.level,
      close: () => {
        sound.closed = true;
      },
    }),
    now: () => (clock.time += clock.step),
    document,
  };
  return { track, stream, document, clock, sound, host };
}
