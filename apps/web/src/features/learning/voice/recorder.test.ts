import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from '../../../test/fake-recorder';
import { createVoiceRecorder, recordingFormat, type RecorderHost } from './recorder';

function setup(getUserMedia?: RecorderHost['getUserMedia']) {
  const microphone = fakeMicrophone(getUserMedia);
  const events = { onStart: vi.fn(), onStop: vi.fn(), onFail: vi.fn() };
  return { ...microphone, events, recorder: createVoiceRecorder(events, microphone.host) };
}

// A microphone prompt the test answers later.
function prompt() {
  const answers: ((answer: MediaStream | Error | DOMException) => void)[] = [];
  const getUserMedia = () =>
    new Promise<MediaStream>((resolve, reject) => {
      answers.push((answer) =>
        answer instanceof DOMException || answer instanceof Error
          ? reject(answer)
          : resolve(answer),
      );
    });
  return { getUserMedia, answers };
}

function hide(document: Document) {
  Object.assign(document, { hidden: true });
  document.dispatchEvent(new Event('visibilitychange'));
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

it('records at the agreed bit rate and hands over the audio when the child lets go', async () => {
  const { recorder, events, track } = setup();
  await recorder.start('hold');
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

it('sends nothing held for less than half a second', async () => {
  const { recorder, events, clock, track } = setup();
  clock.step = 400;
  await recorder.start('hold');
  recorder.stop();
  expect(track.stopped).toBe(true);
  expect(events.onStop).not.toHaveBeenCalled();
  expect(events.onFail).toHaveBeenCalledExactlyOnceWith('short');
});

it('finds a stop before the microphone has opened too short, and releases it once it opens', async () => {
  const { getUserMedia, answers } = prompt();
  const context = setup(getUserMedia);
  const opening = context.recorder.start('hold');
  context.recorder.stop();
  expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith('short');
  answers[0]!(context.stream);
  await opening;
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStart).not.toHaveBeenCalled();
});

it('stops by itself at the time limit and keeps what was said', async () => {
  vi.useFakeTimers();
  const { recorder, events, track } = setup();
  await recorder.start('hold');
  vi.advanceTimersByTime(29_999);
  expect(events.onStop).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(events.onStop).toHaveBeenCalledOnce();
  expect(track.stopped).toBe(true);
});

it('listens until the child has spoken and been quiet for a moment', async () => {
  vi.useFakeTimers();
  const { recorder, events, clock, sound, track } = setup();
  clock.step = 100;
  await recorder.start('listen');
  sound.level = 0.2;
  vi.advanceTimersByTime(1000);
  sound.level = 0;
  vi.advanceTimersByTime(1300);
  expect(events.onStop).not.toHaveBeenCalled();
  vi.advanceTimersByTime(300);
  expect(events.onStop).toHaveBeenCalledOnce();
  expect(track.stopped).toBe(true);
  expect(sound.closed).toBe(true);
});

it('closes the microphone when nobody speaks while it listens', async () => {
  vi.useFakeTimers();
  const { recorder, events, clock, track } = setup();
  clock.step = 100;
  await recorder.start('listen');
  vi.advanceTimersByTime(8000);
  expect(events.onStop).not.toHaveBeenCalled();
  expect(events.onFail).toHaveBeenCalledExactlyOnceWith('quiet');
  expect(track.stopped).toBe(true);
});

type Context = ReturnType<typeof setup>;
const leaving = [
  ['the page is hidden', ({ document }: Context) => hide(document)],
  ['the microphone goes away', ({ track }: Context) => track.dispatchEvent(new Event('ended'))],
] as const;

it.each(leaving)('keeps what the child held the button to say when %s', async (_name, act) => {
  const context = setup();
  await context.recorder.start('hold');
  act(context);
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStop).toHaveBeenCalledOnce();
  expect(context.events.onFail).not.toHaveBeenCalled();
});

it.each(leaving)('drops what the page listened for on its own when %s', async (_name, act) => {
  const context = setup();
  await context.recorder.start('listen');
  act(context);
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStop).not.toHaveBeenCalled();
  expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith('interrupted');
});

it.each([
  ['the child cancels', (context: Context) => context.recorder.cancel(), undefined],
  ['the recorder fails', () => FakeRecorder.last?.onerror?.(), 'interrupted'],
] as const)('drops the audio and releases the microphone when %s', async (_name, act, failure) => {
  const context = setup();
  await context.recorder.start('hold');
  act(context);
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStop).not.toHaveBeenCalled();
  if (failure) expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith(failure);
  else expect(context.events.onFail).not.toHaveBeenCalled();
});

it('keeps a finished recording when the page hides before the recorder closes', async () => {
  const { recorder, events, document } = setup();
  await recorder.start('hold');
  const fake = FakeRecorder.last!;
  fake.deferStop = true;
  recorder.stop();
  hide(document);
  recorder.cancel();
  fake.onstop?.();
  expect(events.onStop).toHaveBeenCalledOnce();
  expect(events.onFail).not.toHaveBeenCalled();
});

it('reports a refused microphone and a browser without recording', async () => {
  const denied = setup(
    vi.fn(async () => Promise.reject(new DOMException('no', 'NotAllowedError'))),
  );
  await denied.recorder.start('hold');
  expect(denied.events.onFail).toHaveBeenCalledExactlyOnceWith('denied');
  FakeRecorder.supported = [];
  const unsupported = setup();
  await unsupported.recorder.start('hold');
  expect(unsupported.events.onFail).toHaveBeenCalledExactlyOnceWith('unsupported');
  expect(unsupported.host.getUserMedia).not.toHaveBeenCalled();
});

it('releases the microphone and reports it when the browser refuses the recording format', async () => {
  FakeRecorder.refuse = true;
  const { recorder, events, track } = setup();
  await recorder.start('hold');
  expect(track.stopped).toBe(true);
  expect(events.onStart).not.toHaveBeenCalled();
  expect(events.onFail).toHaveBeenCalledExactlyOnceWith('unsupported');
});

it('ends a cancelled start silently, whether the prompt is granted or refused', async () => {
  const { getUserMedia, answers } = prompt();
  const context = setup(getUserMedia);
  const granted = context.recorder.start('hold');
  context.recorder.cancel();
  answers[0]!(context.stream);
  await granted;
  expect(context.track.stopped).toBe(true);
  const refused = context.recorder.start('hold');
  context.recorder.cancel();
  answers[1]!(new DOMException('no', 'NotAllowedError'));
  await refused;
  expect(context.events.onStart).not.toHaveBeenCalled();
  expect(context.events.onFail).not.toHaveBeenCalled();
});

it('starts again after a cancel even while the first prompt is still open', async () => {
  const { getUserMedia, answers } = prompt();
  const context = setup(getUserMedia);
  const first = context.recorder.start('hold');
  context.recorder.cancel();
  const second = context.recorder.start('hold');
  expect(answers).toHaveLength(2);
  answers[0]!(context.stream);
  answers[1]!(context.stream);
  await Promise.all([first, second]);
  expect(context.events.onStart).toHaveBeenCalledOnce();
});

it('releases a microphone granted while the page is hidden and reports the interruption', async () => {
  const context = setup();
  Object.assign(context.document, { hidden: true });
  await context.recorder.start('hold');
  expect(context.track.stopped).toBe(true);
  expect(context.events.onStart).not.toHaveBeenCalled();
  expect(context.events.onFail).toHaveBeenCalledExactlyOnceWith('interrupted');
});

it('reports an empty recording instead of sending silence', async () => {
  const { recorder, events } = setup();
  await recorder.start('hold');
  const fake = FakeRecorder.last!;
  fake.ondataavailable = null;
  recorder.stop();
  expect(events.onFail).toHaveBeenCalledExactlyOnceWith('empty');
});
