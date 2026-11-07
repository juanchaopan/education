import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useNarration } from './useNarration';

function setup() {
  const audios: HTMLAudioElement[] = [];
  const createAudio = () => {
    const audio = new Audio();
    vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    vi.spyOn(audio, 'pause').mockImplementation(() => {});
    audios.push(audio);
    return audio;
  };
  const view = renderHook(({ stepId }) => useNarration(stepId, createAudio), {
    initialProps: { stepId: 'count' },
  });
  return { ...view, audios };
}

function showPage(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

it('shows what the child can do with the current cue', async () => {
  const { result, audios } = setup();
  expect(result.current.status).toBe('silent');
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.play('/count.mp3');
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

it('stops the previous step when the step changes and never replays it', async () => {
  const { result, rerender, audios } = setup();
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.play('/count.mp3');
  });
  rerender({ stepId: 'share' });
  await expect(finished).resolves.toBe('cancelled');
  expect(audios[0]!.pause).toHaveBeenCalled();
  expect(result.current.status).toBe('silent');
  act(() => result.current.replay());
  expect(audios).toHaveLength(1);
});

it('pauses the cue when the page goes to the background and waits for the child', () => {
  const { result, audios } = setup();
  act(() => void result.current.play('/count.mp3'));
  act(() => showPage('visible'));
  expect(result.current.status).toBe('playing');
  act(() => showPage('hidden'));
  expect(audios[0]!.pause).toHaveBeenCalledOnce();
  expect(result.current.status).toBe('paused');
});

it('stops the cue when the lesson closes', async () => {
  const { result, unmount, audios } = setup();
  let finished!: Promise<unknown>;
  act(() => {
    finished = result.current.play('/count.mp3');
  });
  unmount();
  await expect(finished).resolves.toBe('cancelled');
  showPage('hidden');
  expect(audios[0]!.pause).toHaveBeenCalledOnce();
});
