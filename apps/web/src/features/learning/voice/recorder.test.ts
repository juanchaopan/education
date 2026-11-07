import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from './fake-recorder';
import { createVoiceRecorder, recordingFormat, type RecorderHost } from './recorder';

function setup(getUserMedia?: RecorderHost['getUserMedia']) {
  const microphone = fakeMicrophone(getUserMedia);
  const events = { onStart: vi.fn(), onStop: vi.fn(), onFail: vi.fn() };
  return { ...microphone, events, recorder: createVoiceRecorder(events, microphone.host) };
}

beforeEach(() => FakeRecorder.reset());
afterEach(() => vi.useRealTimers());

it('prefers WebM/Opus and falls back to MP4 where only that is recorded', () => {
  expect(recordingFormat(FakeRecorder)?.format).toBe('webm');
  FakeRecorder.supported = ['audio/mp4'];
  expect(recordingFormat(FakeRecorder)).toEqual({ mimeType: 'audio/mp4', format: 'mp4' });
  FakeRecorder.supported = [];
  expect(recordingFormat(FakeRecorder)).toBeUndefined();
});

it('records at the agreed bit rate and hands over the audio when the child stops', async () => {
  const { recorder, events, track } = setup();
  await recorder.start();
  expect(events.onStart).toHaveBeenCalledOnce();
  expect(FakeRecorder.last?.options).toEqual({
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 32_000,
  });
  recorder.stop();
  expect(track.stopped).toBe(true);
  const [{ audio, format }] = events.onStop.mock.calls[0]!;
  expect(format).toBe('webm');
  expect(await audio.text()).toBe('voice');
  expect(events.onFail).not.toHaveBeenCalled();
});

it('stops by itself at the time limit and keeps what was said', async () => {
  vi.useFakeTimers();
  const { recorder, events, track } = setup();
  await recorder.start();
  vi.advanceTimersByTime(29_999);
  expect(events.onStop).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(events.onStop).toHaveBeenCalledOnce();
  expect(track.stopped).toBe(true);
});

type Context = ReturnType<typeof setup>;

it.each([
  ['the child cancels', (context: Context) => context.recorder.cancel(), undefined],
  [
    'the page is hidden',
    ({ document }: Context) => {
      Object.assign(document, { hidden: true });
      document.dispatchEvent(new Event('visibilitychange'));
    },
    'interrupted',
  ],
  [
    'the microphone goes away',
    ({ track }: Context) => track.dispatchEvent(new Event('ended')),
    'interrupted',
  ],
  ['the recorder fails', () => FakeRecorder.last?.onerror?.(), 'interrupted'],
] as const)('drops the audio and releases the microphone when %s', async (_name, act, failure) => {
  const context = setup();
  await context.recorder.start();
  act(context);
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStop).not.toHaveBeenCalled();
  if (failure) expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith(failure);
  else expect(context.events.onFail).not.toHaveBeenCalled();
});

it('reports a refused microphone and a browser without recording', async () => {
  const denied = setup(
    vi.fn(async () => Promise.reject(new DOMException('no', 'NotAllowedError'))),
  );
  await denied.recorder.start();
  expect(denied.events.onFail).toHaveBeenCalledExactlyOnceWith('denied');
  FakeRecorder.supported = [];
  const unsupported = setup();
  await unsupported.recorder.start();
  expect(unsupported.events.onFail).toHaveBeenCalledExactlyOnceWith('unsupported');
  expect(unsupported.host.getUserMedia).not.toHaveBeenCalled();
});

it('releases a microphone granted after the child cancelled', async () => {
  let grant!: () => void;
  const context = setup(
    () =>
      new Promise((resolve) => {
        grant = () => resolve(context.stream);
      }),
  );
  const starting = context.recorder.start();
  context.recorder.cancel();
  grant();
  await starting;
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStart).not.toHaveBeenCalled();
  expect(context.events.onFail).not.toHaveBeenCalled();
});

it('releases a microphone granted while the page is hidden and reports the interruption', async () => {
  const context = setup();
  Object.assign(context.document, { hidden: true });
  await context.recorder.start();
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStart).not.toHaveBeenCalled();
  expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith('interrupted');
});

it('reports an empty recording instead of sending silence', async () => {
  const { recorder, events } = setup();
  await recorder.start();
  const fake = FakeRecorder.last!;
  fake.stop = function stop() {
    this.state = 'inactive';
    this.onstop?.();
  };
  recorder.stop();
  expect(events.onFail).toHaveBeenCalledExactlyOnceWith('empty');
});
