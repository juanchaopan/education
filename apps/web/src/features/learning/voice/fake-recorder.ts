import { vi } from 'vitest';
import type { RecorderHost } from './recorder';

// Test doubles for the browser's microphone and MediaRecorder. Stopping the
// fake recorder delivers one short chunk, as a real recorder does on stop.
export class FakeTrack extends EventTarget {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

export class FakeRecorder {
  static supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  static last: FakeRecorder | undefined;
  static isTypeSupported(type: string) {
    return FakeRecorder.supported.includes(type);
  }
  static reset() {
    FakeRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    FakeRecorder.last = undefined;
  }
  state: RecordingState = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;
  readonly stream: MediaStream;
  readonly options: MediaRecorderOptions;
  constructor(stream: MediaStream, options: MediaRecorderOptions) {
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
    this.onstop?.();
  }
}

export function fakeMicrophone(getUserMedia?: RecorderHost['getUserMedia']) {
  const track = new FakeTrack();
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  const document = Object.assign(new EventTarget(), { hidden: false }) as unknown as Document;
  const host: RecorderHost = {
    getUserMedia: getUserMedia ?? vi.fn(async () => stream),
    Recorder: FakeRecorder as unknown as typeof MediaRecorder,
    document,
  };
  return { track, stream, document, host };
}
