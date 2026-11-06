import { describe, expect, it, vi } from 'vitest';
import { createNarration } from './narration';

function player() {
  const audio = new Audio();
  const start = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
  const pause = vi.spyOn(audio, 'pause').mockImplementation(() => {});
  const narration = createNarration(() => audio);
  return { audio, narration, start, pause };
}

describe('lesson narration', () => {
  it('reveals a cue once at playback and waits for the real end before advancing', async () => {
    const { audio, narration, start } = player();
    const show = vi.fn();
    const advance = vi.fn();
    const complete = narration.play('/intro.mp3', show).then(advance);
    expect(show).not.toHaveBeenCalled();
    audio.dispatchEvent(new Event('playing'));
    audio.dispatchEvent(new Event('playing'));
    expect(show).toHaveBeenCalledOnce();
    await expect(narration.play('/next.mp3')).resolves.toBe('busy');
    expect(start).toHaveBeenCalledOnce();
    expect(advance).not.toHaveBeenCalled();
    audio.dispatchEvent(new Event('ended'));
    await complete;
    expect(advance).toHaveBeenCalledWith('ended');
  });

  it('makes blocked or missing sound visible through the same cue without reporting playback', async () => {
    const { narration, start, audio } = player();
    const show = vi.fn();
    start.mockRejectedValueOnce(new Error('Autoplay blocked'));
    await expect(narration.play('/intro.mp3', show)).resolves.toBe('unavailable');
    audio.dispatchEvent(new Event('playing'));
    await expect(narration.play(undefined, show)).resolves.toBe('unavailable');
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('stays on the current cue while a child asks a question and resumes at the same position', async () => {
    const { audio, narration, start, pause } = player();
    const show = vi.fn();
    const advance = vi.fn();
    const running = narration.play('/intro.mp3', show).then(advance);
    audio.dispatchEvent(new Event('playing'));
    audio.currentTime = 1.5;
    narration.pause();
    expect(pause).toHaveBeenCalledOnce();
    expect(advance).not.toHaveBeenCalled();
    await expect(narration.play('/next.mp3')).resolves.toBe('busy');
    narration.resume();
    expect(start).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(1.5);
    audio.dispatchEvent(new Event('playing'));
    expect(show).toHaveBeenCalledOnce();
    audio.dispatchEvent(new Event('ended'));
    await running;
    expect(advance).toHaveBeenCalledWith('ended');
  });

  it('ignores a pending play rejection caused by pausing before the audio starts', async () => {
    const { audio, narration, start } = player();
    let reject!: (error: Error) => void;
    start.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const show = vi.fn();
    const running = narration.play('/intro.mp3', show);
    narration.pause();
    reject(new Error('Interrupted'));
    await Promise.resolve();
    expect(show).not.toHaveBeenCalled();
    narration.resume();
    audio.dispatchEvent(new Event('playing'));
    audio.dispatchEvent(new Event('ended'));
    await expect(running).resolves.toBe('ended');
    expect(show).toHaveBeenCalledOnce();
  });

  it('lets the scene leave an interrupted cue without firing its reveal again', async () => {
    const { audio, narration, pause } = player();
    const show = vi.fn();
    const running = narration.play('/intro.mp3', show);
    narration.stop();
    await expect(running).resolves.toBe('cancelled');
    audio.dispatchEvent(new Event('ended'));
    expect(pause).toHaveBeenCalledOnce();
    expect(show).not.toHaveBeenCalled();
  });
});
