import { describe, expect, it, vi } from 'vitest';
import { createNarration, type NarrationStatus } from './narration';

type Speaker = ReturnType<typeof speaker>;

function speaker() {
  const audio = new Audio();
  const start = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
  const pause = vi.spyOn(audio, 'pause').mockImplementation(() => {});
  return { audio, start, pause };
}

function player(prepare: (speaker: Speaker) => void = () => {}) {
  const speakers: Speaker[] = [];
  const statuses: NarrationStatus[] = [];
  const narration = createNarration({
    createAudio: () => {
      const next = speaker();
      prepare(next);
      speakers.push(next);
      return next.audio;
    },
    onStatus: (status) => statuses.push(status),
  });
  return { narration, speakers, statuses, latest: () => speakers.at(-1)! };
}

const blocked = (next: Speaker) => next.start.mockRejectedValue(new Error('Autoplay blocked'));

describe('lesson narration', () => {
  it('reveals a cue once at playback and waits for the real end before advancing', async () => {
    const { narration, latest } = player();
    const show = vi.fn();
    const advance = vi.fn();
    const complete = narration.play('count', '/intro.mp3', show).then(advance);
    const { audio, start } = latest();
    expect(show).not.toHaveBeenCalled();
    audio.dispatchEvent(new Event('playing'));
    audio.dispatchEvent(new Event('playing'));
    expect(show).toHaveBeenCalledOnce();
    await expect(narration.play('count', '/next.mp3')).resolves.toBe('busy');
    expect(start).toHaveBeenCalledOnce();
    expect(advance).not.toHaveBeenCalled();
    audio.dispatchEvent(new Event('ended'));
    await complete;
    expect(advance).toHaveBeenCalledWith('ended');
  });

  it('makes blocked or missing sound visible through the same cue and reports it', async () => {
    const { narration, statuses } = player(blocked);
    const show = vi.fn();
    await expect(narration.play('count', '/intro.mp3', show)).resolves.toBe('unavailable');
    expect(statuses).toEqual(['playing', 'failed']);
    await expect(narration.play('count', undefined, show)).resolves.toBe('unavailable');
    expect(show).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('silent');
  });

  it('stays on the current cue while a child asks a question and resumes at the same position', async () => {
    const { narration, latest, statuses } = player();
    const show = vi.fn();
    const advance = vi.fn();
    const running = narration.play('count', '/intro.mp3', show).then(advance);
    const { audio, start, pause } = latest();
    audio.dispatchEvent(new Event('playing'));
    audio.currentTime = 1.5;
    narration.pause();
    expect(pause).toHaveBeenCalledOnce();
    expect(statuses.at(-1)).toBe('paused');
    expect(advance).not.toHaveBeenCalled();
    await expect(narration.play('count', '/next.mp3')).resolves.toBe('busy');
    narration.resume();
    expect(statuses.at(-1)).toBe('playing');
    expect(start).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(1.5);
    audio.dispatchEvent(new Event('playing'));
    expect(show).toHaveBeenCalledOnce();
    audio.dispatchEvent(new Event('ended'));
    await running;
    expect(advance).toHaveBeenCalledWith('ended');
    expect(statuses.at(-1)).toBe('ready');
  });

  it('ignores a pending play rejection caused by pausing before the audio starts', async () => {
    let reject!: (error: Error) => void;
    const { narration, latest } = player((next) =>
      next.start.mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      ),
    );
    const show = vi.fn();
    const running = narration.play('count', '/intro.mp3', show);
    narration.pause();
    reject(new Error('Interrupted'));
    await Promise.resolve();
    expect(show).not.toHaveBeenCalled();
    narration.resume();
    latest().audio.dispatchEvent(new Event('playing'));
    latest().audio.dispatchEvent(new Event('ended'));
    await expect(running).resolves.toBe('ended');
    expect(show).toHaveBeenCalledOnce();
  });

  it('lets the scene leave an interrupted cue without firing its reveal again', async () => {
    const { narration, latest, statuses } = player();
    const show = vi.fn();
    const running = narration.play('count', '/intro.mp3', show);
    const { audio, pause } = latest();
    narration.stop();
    await expect(running).resolves.toBe('cancelled');
    audio.dispatchEvent(new Event('ended'));
    expect(pause).toHaveBeenCalledOnce();
    expect(show).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('silent');
  });
});

describe('moving between steps', () => {
  it('lets a cue for the next step replace what the previous step was saying', async () => {
    const { narration, speakers } = player();
    const previous = narration.play('count', '/count.mp3');
    const next = narration.play('share', '/share.mp3');
    await expect(previous).resolves.toBe('cancelled');
    expect(speakers[0]!.pause).toHaveBeenCalledOnce();
    speakers[1]!.audio.dispatchEvent(new Event('ended'));
    await expect(next).resolves.toBe('ended');
  });

  it('stops and forgets an earlier step but keeps the cue of the step on screen', async () => {
    const { narration, speakers, statuses } = player();
    const previous = narration.play('count', '/count.mp3');
    narration.keep('share');
    await expect(previous).resolves.toBe('cancelled');
    expect(statuses.at(-1)).toBe('silent');
    narration.replay();
    expect(speakers).toHaveLength(1);
    void narration.play('share', '/share.mp3');
    narration.keep('share');
    expect(speakers[1]!.pause).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('playing');
  });
});

describe('hearing a cue again', () => {
  it('restarts a playing cue from its start on the same element, and the scene still waits', async () => {
    const { narration, speakers, statuses } = player();
    const advance = vi.fn();
    const running = narration.play('count', '/intro.mp3').then(advance);
    const { audio, start } = speakers[0]!;
    audio.dispatchEvent(new Event('playing'));
    audio.currentTime = 2;
    narration.replay();
    narration.replay();
    expect(speakers).toHaveLength(1);
    expect(audio.currentTime).toBe(0);
    expect(start).toHaveBeenCalledTimes(3);
    await Promise.resolve();
    expect(advance).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('playing');
    audio.dispatchEvent(new Event('ended'));
    await running;
    expect(advance).toHaveBeenCalledOnce();
  });

  it('restarts a paused cue from its start', () => {
    const { narration, latest, statuses } = player();
    void narration.play('count', '/intro.mp3');
    const { audio } = latest();
    audio.currentTime = 3;
    narration.pause();
    narration.replay();
    expect(audio.currentTime).toBe(0);
    expect(statuses.at(-1)).toBe('playing');
  });

  it('plays the last cue again once it has ended, and gives way to the next cue', async () => {
    const { narration, speakers, statuses } = player();
    const first = narration.play('count', '/intro.mp3');
    speakers[0]!.audio.dispatchEvent(new Event('ended'));
    await first;
    narration.replay();
    expect(speakers).toHaveLength(2);
    expect(speakers[1]!.audio.src).toContain('/intro.mp3');
    const next = narration.play('count', '/next.mp3');
    expect(speakers[1]!.pause).toHaveBeenCalledOnce();
    expect(speakers).toHaveLength(3);
    speakers[1]!.audio.dispatchEvent(new Event('ended'));
    speakers[2]!.audio.dispatchEvent(new Event('ended'));
    await expect(next).resolves.toBe('ended');
    expect(statuses).toEqual(['playing', 'ready', 'playing', 'ready', 'playing', 'ready']);
  });

  it('tries a clip again after it would not start', async () => {
    const { narration, statuses } = player(blocked);
    await narration.play('count', '/intro.mp3');
    narration.replay();
    await vi.waitFor(() => expect(statuses).toEqual(['playing', 'failed', 'playing', 'failed']));
  });

  it('forgets a cue the scene has stopped', () => {
    const { narration, speakers, statuses } = player();
    void narration.play('count', '/intro.mp3');
    narration.stop();
    narration.replay();
    expect(speakers).toHaveLength(1);
    expect(statuses.at(-1)).toBe('silent');
  });

  it('has nothing to replay, pause or continue before any cue', () => {
    const { narration, speakers, statuses } = player();
    narration.replay();
    narration.pause();
    narration.resume();
    expect(speakers).toHaveLength(0);
    expect(statuses).toEqual([]);
  });
});
