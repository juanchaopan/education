import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { fakeAudio } from '../../../test/fake-audio';
import { silenceWarnings } from '../../../test/silence-warnings';
import { useNarration } from './useNarration';

function setup(prepare?: (audio: HTMLAudioElement) => void) {
  const { audios, createAudio } = fakeAudio(prepare);
  const view = renderHook(({ stepId }) => useNarration(stepId, createAudio), {
    initialProps: { stepId: 'count' },
  });
  return { ...view, audios };
}

const visibility = vi.spyOn(document, 'visibilityState', 'get');

function showPage(state: DocumentVisibilityState) {
  visibility.mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

silenceWarnings();
afterEach(() => visibility.mockReset());

it('shows what the child can do with the current line', async () => {
  const { result, audios } = setup();
  expect(result.current.status).toBe('silent');
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.interrupt('count', '/count.mp3');
  });
  expect(result.current.status).toBe('playing');
  act(() => result.current.pause());
  expect(result.current.status).toBe('paused');
  act(() => result.current.resume());
  await act(async () => {
    audios[0]!.dispatchEvent(new Event('ended'));
    await finished;
  });
  expect(result.current.status).toBe('ready');
});

it('tells why a line did not come out while it waits to be heard again', async () => {
  const { result } = setup((audio) =>
    vi.mocked(audio.play).mockRejectedValueOnce(new DOMException('', 'NotAllowedError')),
  );
  await act(async () => void result.current.interrupt('count', '/count.mp3'));
  expect(result.current).toMatchObject({ status: 'failed', failure: 'refused' });
  act(() => result.current.replay());
  expect(result.current).toMatchObject({ status: 'playing', failure: undefined });
});

it('keeps the same report when nothing about the line changed', () => {
  const { result } = setup();
  act(() => void result.current.interrupt('count', '/count.mp3'));
  const playing = result.current;
  act(() => result.current.resume());
  act(() => result.current.replay());
  expect(result.current.status).toBe(playing.status);
  expect(result.current).toBe(playing);
});

it('stops the previous step when the step changes and never replays it', async () => {
  const { result, rerender, audios } = setup();
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.interrupt('count', '/count.mp3');
  });
  rerender({ stepId: 'share' });
  await expect(finished).resolves.toBe('cancelled');
  expect(audios[0]!.pause).toHaveBeenCalled();
  expect(result.current.status).toBe('silent');
  act(() => result.current.replay());
  expect(audios[0]!.play).toHaveBeenCalledOnce();
});

it('keeps the first line of the new step when the scene starts it while moving on', () => {
  const { result, rerender, audios } = setup();
  act(() => void result.current.interrupt('count', '/count.mp3'));
  act(() => void result.current.interrupt('share', '/share.mp3'));
  rerender({ stepId: 'share' });
  expect(audios).toHaveLength(1);
  expect(audios[0]!.pause).toHaveBeenCalledOnce();
  expect(result.current.status).toBe('playing');
});

it('pauses the line when the page goes to the background and waits for the child', () => {
  const { result, audios } = setup();
  act(() => void result.current.interrupt('count', '/count.mp3'));
  act(() => showPage('visible'));
  expect(result.current.status).toBe('playing');
  act(() => showPage('hidden'));
  expect(audios[0]!.pause).toHaveBeenCalledOnce();
  expect(result.current.status).toBe('paused');
});

it('stops the line when the lesson closes', async () => {
  const { result, unmount, audios } = setup();
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.interrupt('count', '/count.mp3');
  });
  unmount();
  await expect(finished).resolves.toBe('cancelled');
  showPage('hidden');
  expect(audios[0]!.pause).toHaveBeenCalledOnce();
});
