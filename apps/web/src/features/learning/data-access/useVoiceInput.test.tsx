import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from '../../../test/fake-recorder';
import { requestTranscription } from './transcription-request';
import { useVoiceInput } from './useVoiceInput';

vi.mock('./transcription-request', () => ({ requestTranscription: vi.fn() }));

const scope = { id: 'share-sweets', version: 1, csrf: 'session-token' };

function setup(microphone = fakeMicrophone()) {
  const onConfirm = vi.fn();
  const hook = renderHook(() => useVoiceInput(scope, 'split-evenly', onConfirm, microphone.host));
  return { ...hook, ...microphone, onConfirm };
}

async function recordAndStop(result: ReturnType<typeof setup>['result']) {
  await act(() => result.current.start());
  expect(result.current.state).toEqual({ status: 'recording' });
  act(() => result.current.stop());
}

beforeEach(() => FakeRecorder.reset());
afterEach(() => vi.resetAllMocks());

it('records, proposes the heard text for correction and confirms only the edited text', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({ status: 'ready', text: '每分是四' });
  const { result, onConfirm } = setup();
  expect(result.current.state).toEqual({ status: 'idle' });
  await recordAndStop(result);
  await waitFor(() => expect(result.current.state).toEqual({ status: 'review', text: '每分是四' }));
  const [, { stepId, recording }, signal] = vi.mocked(requestTranscription).mock.calls[0]!;
  expect(stepId).toBe('split-evenly');
  expect(recording.format).toBe('webm');
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(onConfirm).not.toHaveBeenCalled();
  act(() => result.current.edit(' 每份是四。 '));
  act(() => result.current.confirm());
  expect(onConfirm).toHaveBeenCalledExactlyOnceWith('每份是四。');
  expect(result.current.state).toEqual({ status: 'idle' });
});

it('shows recognition under way as soon as the child finishes speaking', async () => {
  vi.mocked(requestTranscription).mockReturnValue(new Promise(() => {}));
  const microphone = fakeMicrophone();
  const { result } = setup(microphone);
  await act(() => result.current.start());
  FakeRecorder.last!.deferStop = true;
  act(() => result.current.stop());
  expect(result.current.state).toEqual({ status: 'transcribing' });
  act(() => result.current.stop());
  act(() => FakeRecorder.last!.onstop?.());
  await waitFor(() => expect(requestTranscription).toHaveBeenCalledOnce());
});

it('never confirms an emptied text and ignores edits outside review', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({ status: 'ready', text: '四' });
  const { result, onConfirm } = setup();
  await recordAndStop(result);
  await waitFor(() => expect(result.current.state.status).toBe('review'));
  act(() => result.current.edit('  '));
  act(() => result.current.confirm());
  expect(onConfirm).not.toHaveBeenCalled();
  act(() => result.current.discard());
  expect(result.current.state).toEqual({ status: 'idle' });
  act(() => result.current.edit('迟到的输入'));
  expect(result.current.state).toEqual({ status: 'idle' });
});

it('turns silence, refusals and failures into states that keep typing open', async () => {
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
    await recordAndStop(result);
    await waitFor(() => expect(result.current.state).toEqual(expected));
  }
});

it('reports a refused microphone without contacting the server', async () => {
  const denied = fakeMicrophone(async () =>
    Promise.reject(new DOMException('no', 'NotAllowedError')),
  );
  const { result } = setup(denied);
  await act(() => result.current.start());
  expect(result.current.state).toEqual({ status: 'unavailable', reason: 'denied' });
  expect(requestTranscription).not.toHaveBeenCalled();
});

it('cancelling a recording discards it and sends nothing', async () => {
  const { result, track } = setup();
  await act(() => result.current.start());
  act(() => result.current.cancel());
  expect(result.current.state).toEqual({ status: 'idle' });
  expect(track.stopped).toBe(true);
  expect(requestTranscription).not.toHaveBeenCalled();
});

it('ignores a late transcription once the child chooses to type instead', async () => {
  let finish!: (value: { status: 'ready'; text: string }) => void;
  vi.mocked(requestTranscription).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result } = setup();
  await recordAndStop(result);
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
  await recordAndStop(first.result);
  await waitFor(() => expect(signal).toBeDefined());
  first.unmount();
  expect(signal?.aborted).toBe(true);

  const second = setup();
  await act(() => second.result.current.start());
  second.unmount();
  expect(second.track.stopped).toBe(true);
});
