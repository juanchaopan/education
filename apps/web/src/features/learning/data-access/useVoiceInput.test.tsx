import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from '../../../test/fake-recorder';
import { createMicrophoneTurn, type MicrophoneTurn } from '../voice/microphone-turn';
import type { RecordingMode } from '../voice/recorder';
import { requestTranscription } from './transcription-request';
import { useVoiceInput } from './useVoiceInput';

vi.mock('./transcription-request', () => ({ requestTranscription: vi.fn() }));

const scope = { id: 'share-sweets', version: 1, csrf: 'session-token' };

function setup(microphone = fakeMicrophone(), mode: RecordingMode = 'hold', turn?: MicrophoneTurn) {
  const hook = renderHook(() =>
    useVoiceInput(scope, 'split-evenly', mode, { host: microphone.host, turn }),
  );
  return { ...hook, ...microphone };
}

async function recordAndRelease(result: ReturnType<typeof setup>['result']) {
  await act(async () => void result.current.start());
  expect(result.current.state).toEqual({ status: 'recording' });
  act(() => result.current.release());
}

beforeEach(() => FakeRecorder.reset());
afterEach(() => vi.resetAllMocks());

it('records while held, proposes the heard text for correction and confirms only the edited text', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({ status: 'ready', text: '每分是四' });
  const { result } = setup();
  expect(result.current.state).toEqual({ status: 'idle' });
  await recordAndRelease(result);
  await waitFor(() => expect(result.current.state).toEqual({ status: 'review', text: '每分是四' }));
  const [, { stepId, recording }, signal] = vi.mocked(requestTranscription).mock.calls[0]!;
  expect(stepId).toBe('split-evenly');
  expect(recording.format).toBe('webm');
  expect(signal).toBeInstanceOf(AbortSignal);
  act(() => result.current.edit(' 每份是四。 '));
  let confirmed: string | undefined;
  act(() => void (confirmed = result.current.confirm()));
  expect(confirmed).toBe('每份是四。');
  expect(result.current.state).toEqual({ status: 'idle' });
});

it('shows recognition under way as soon as the child lets go', async () => {
  vi.mocked(requestTranscription).mockReturnValue(new Promise(() => {}));
  const { result } = setup();
  await act(async () => void result.current.start());
  FakeRecorder.last!.deferStop = true;
  act(() => result.current.release());
  expect(result.current.state).toEqual({ status: 'transcribing' });
  act(() => result.current.release());
  act(() => FakeRecorder.last!.onstop?.());
  await waitFor(() => expect(requestTranscription).toHaveBeenCalledOnce());
});

it('asks to hold longer when the child lets go before the microphone opens or too soon', async () => {
  let open: (stream: MediaStream) => void = () => {};
  const slow = fakeMicrophone(() => new Promise((resolve) => (open = resolve)));
  const { result, stream, track } = setup(slow);
  act(() => void result.current.start());
  act(() => result.current.release());
  expect(result.current.state).toEqual({ status: 'unavailable', reason: 'short' });
  await act(async () => open(stream));
  expect(track.stopped).toBe(true);

  const quick = setup();
  quick.clock.step = 100;
  await recordAndRelease(quick.result);
  expect(quick.result.current.state).toEqual({ status: 'unavailable', reason: 'short' });
  expect(requestTranscription).not.toHaveBeenCalled();
});

it('never confirms an emptied text and ignores edits outside review', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({ status: 'ready', text: '四' });
  const { result } = setup();
  await recordAndRelease(result);
  await waitFor(() => expect(result.current.state.status).toBe('review'));
  act(() => result.current.edit('  '));
  expect(result.current.confirm()).toBeUndefined();
  act(() => result.current.cancel());
  act(() => result.current.edit('迟到的输入'));
  expect(result.current.state).toEqual({ status: 'idle' });
});

it('turns silence, refusals and failures into states to explain', async () => {
  vi.mocked(requestTranscription)
    .mockResolvedValueOnce({ status: 'unheard' })
    .mockResolvedValueOnce({ status: 'fallback', reason: 'unauthorized' })
    .mockRejectedValueOnce(new Error('private network error'));
  const { result } = setup();
  for (const expected of [
    { status: 'unheard' },
    { status: 'fallback', reason: 'unauthorized' },
    { status: 'fallback', reason: 'unavailable' },
  ]) {
    await recordAndRelease(result);
    await waitFor(() => expect(result.current.state).toEqual(expected));
  }
});

it('reports a refused microphone without contacting the server', async () => {
  const denied = fakeMicrophone(async () =>
    Promise.reject(new DOMException('no', 'NotAllowedError')),
  );
  const { result } = setup(denied);
  await act(async () => void result.current.start());
  expect(result.current.state).toEqual({ status: 'unavailable', reason: 'denied' });
  expect(requestTranscription).not.toHaveBeenCalled();
});

it('lets one speaker at a time use the lesson’s microphone', async () => {
  const turn = createMicrophoneTurn();
  const listening = setup(fakeMicrophone(), 'listen', turn);
  const held = setup(fakeMicrophone(), 'hold', turn);
  const other = setup(fakeMicrophone(), 'hold', turn);
  await act(async () => void listening.result.current.start());
  expect(listening.result.current.state).toEqual({ status: 'recording' });
  expect(held.result.current.blocked).toBe(false);

  await act(async () => void held.result.current.start());
  expect(listening.result.current.state).toEqual({ status: 'idle' });
  expect(listening.track.stopped).toBe(true);
  expect(listening.result.current.blocked).toBe(true);
  expect(other.result.current.blocked).toBe(true);
  let started = true;
  act(() => void (started = other.result.current.start()));
  expect(started).toBe(false);
  expect(other.result.current.state).toEqual({ status: 'idle' });

  vi.mocked(requestTranscription).mockReturnValue(new Promise(() => {}));
  act(() => held.result.current.release());
  expect(listening.result.current.blocked).toBe(false);
  expect(other.result.current.blocked).toBe(false);
});

it('ignores a late transcription once the child stops waiting', async () => {
  let finish!: (value: { status: 'ready'; text: string }) => void;
  vi.mocked(requestTranscription).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result } = setup();
  await recordAndRelease(result);
  await waitFor(() => expect(requestTranscription).toHaveBeenCalledOnce());
  act(() => result.current.guide());
  expect(result.current.state).toEqual({ status: 'guidance' });
  await act(async () => finish({ status: 'ready', text: '四' }));
  expect(result.current.state).toEqual({ status: 'guidance' });
});

it('releases the microphone and the pending request when the lesson closes', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(requestTranscription).mockImplementation((_scope, _input, cancel) => {
    signal = cancel;
    return new Promise(() => {});
  });
  const first = setup();
  await recordAndRelease(first.result);
  await waitFor(() => expect(signal).toBeDefined());
  first.unmount();
  expect(signal?.aborted).toBe(true);

  const second = setup();
  await act(async () => void second.result.current.start());
  second.unmount();
  expect(second.track.stopped).toBe(true);
});
