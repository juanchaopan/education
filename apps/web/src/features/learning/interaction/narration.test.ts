import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudio } from '../../../test/fake-audio';
import { silenceWarnings } from '../../../test/silence-warnings';
import { createNarration, type NarrationFailure, type NarrationStatus } from './narration';

function player(prepare?: (audio: HTMLAudioElement) => void) {
  const { audios, createAudio } = fakeAudio(prepare);
  const statuses: NarrationStatus[] = [];
  const failures: NarrationFailure[] = [];
  const narration = createNarration({
    createAudio,
    onStatus: (status, failure) => {
      statuses.push(status);
      if (failure) failures.push(failure);
    },
  });
  const audio = () => audios[0]!;
  const fire = (event: string) => audio().dispatchEvent(new Event(event));
  return { narration, audios, statuses, failures, audio, fire };
}

// Whether a line has been settled yet, watched from the moment it starts.
function watch(promise: Promise<unknown>) {
  let done = false;
  void promise.then(() => (done = true));
  return () => done;
}

const rejectPlay = (name: string) => (audio: HTMLAudioElement) =>
  vi.mocked(audio.play).mockRejectedValueOnce(new DOMException('', name));
const refused = rejectPlay('NotAllowedError');

function breakMedia(audio: HTMLAudioElement, code: number) {
  Object.defineProperty(audio, 'error', { configurable: true, value: { code } });
  audio.dispatchEvent(new Event('error'));
}

silenceWarnings();
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('one player for the lesson', () => {
  it('plays a line and waits for its real end', async () => {
    const { narration, audios, statuses, fire, audio } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    const done = watch(heard);
    expect(audio().src).toContain('/intro.mp3');
    fire('playing');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(done()).toBe(false);
    fire('ended');
    await expect(heard).resolves.toBe('ended');
    expect(statuses).toEqual(['playing', 'ready']);
    expect(audios).toHaveLength(1);
  });

  it('lets a new line cut in on the same player, so the old one never ends later', async () => {
    const { narration, audios, audio, fire } = player();
    const first = narration.interrupt('swap', '/bridge.mp3');
    fire('playing');
    const next = narration.interrupt('swap', '/one.mp3');
    await expect(first).resolves.toBe('cancelled');
    fire('pause');
    expect(audios).toHaveLength(1);
    expect(audio().pause).toHaveBeenCalledOnce();
    expect(audio().src).toContain('/one.mp3');
    fire('playing');
    fire('ended');
    await expect(next).resolves.toBe('ended');
  });

  it('takes the pause every recording makes at its end for its end', async () => {
    const { narration, failures, audio, fire } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    fire('playing');
    Object.defineProperty(audio(), 'ended', { configurable: true, value: true });
    fire('pause');
    fire('ended');
    await expect(heard).resolves.toBe('ended');
    expect(failures).toEqual([]);
  });
});

describe('a line that does not come out', () => {
  it('waits, however long, for the child to hear a refused line again', async () => {
    const { narration, statuses, failures, audio, fire } = player(refused);
    const heard = narration.interrupt('count', '/intro.mp3');
    const done = watch(heard);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(statuses).toEqual(['playing', 'failed']);
    expect(failures).toEqual(['refused']);
    expect(console.warn).toHaveBeenCalledWith('Narration did not play', {
      clip: '/intro.mp3',
      failure: 'refused',
    });
    expect(done()).toBe(false);
    narration.replay();
    expect(audio().load).toHaveBeenCalledOnce();
    expect(audio().play).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('playing');
    fire('playing');
    fire('ended');
    await expect(heard).resolves.toBe('ended');
  });

  it.each([
    ['a recording the device cannot decode', 4, 'undecodable'],
    ['a recording whose download broke off', 2, 'stalled'],
  ] as const)('reports %s', (_, code, failure) => {
    const { narration, failures, audio } = player();
    void narration.interrupt('count', '/intro.mp3');
    breakMedia(audio(), code);
    expect(failures).toEqual([failure]);
  });

  it.each([
    ['the browser will not play', 'NotSupportedError', 'undecodable'],
    ['the system stopped before it began', 'AbortError', 'interrupted'],
  ] as const)('reports a recording %s', async (_, name, failure) => {
    const { narration, failures } = player(rejectPlay(name));
    void narration.interrupt('count', '/intro.mp3');
    await vi.advanceTimersByTimeAsync(0);
    expect(failures).toEqual([failure]);
  });

  it('counts a line that never starts playing as stalled', async () => {
    const { narration, statuses, failures, audio } = player();
    const done = watch(narration.interrupt('count', '/intro.mp3'));
    await vi.advanceTimersByTimeAsync(10_999);
    expect(statuses).toEqual(['playing']);
    await vi.advanceTimersByTimeAsync(1);
    expect(failures).toEqual(['stalled']);
    expect(audio().pause).toHaveBeenCalledOnce();
    expect(done()).toBe(false);
  });

  it('never counts a playing or paused line as stalled', async () => {
    const { narration, statuses, fire } = player();
    void narration.interrupt('count', '/intro.mp3');
    fire('playing');
    await vi.advanceTimersByTimeAsync(20_000);
    narration.pause();
    fire('pause');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(statuses).toEqual(['playing', 'paused']);
  });

  it('holds a line the system stops partway until the child hears it again', async () => {
    const { narration, statuses, failures, audio, fire } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    const done = watch(heard);
    fire('playing');
    fire('pause');
    expect(failures).toEqual(['interrupted']);
    expect(statuses.at(-1)).toBe('failed');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(done()).toBe(false);
    narration.replay();
    expect(audio().load).toHaveBeenCalledOnce();
    fire('playing');
    fire('ended');
    await expect(heard).resolves.toBe('ended');
  });

  it('keeps waiting to be heard again when the page is hidden and shown', async () => {
    const { narration, statuses } = player(refused);
    void narration.interrupt('count', '/intro.mp3');
    await vi.advanceTimersByTimeAsync(0);
    narration.pause();
    narration.resume();
    expect(statuses).toEqual(['playing', 'failed']);
  });
});

describe('pausing while the child asks a question', () => {
  it('resumes the line at the same position and waits for its end', async () => {
    const { narration, statuses, audio, fire } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    fire('playing');
    audio().currentTime = 1.5;
    narration.pause();
    expect(statuses.at(-1)).toBe('paused');
    narration.resume();
    expect(statuses.at(-1)).toBe('playing');
    expect(audio().play).toHaveBeenCalledTimes(2);
    expect(audio().currentTime).toBe(1.5);
    fire('ended');
    await expect(heard).resolves.toBe('ended');
    expect(statuses.at(-1)).toBe('ready');
  });

  it('holds what happened while paused until the child continues', () => {
    const { narration, statuses, failures, audio } = player();
    void narration.interrupt('count', '/intro.mp3');
    narration.pause();
    breakMedia(audio(), 4);
    expect(statuses.at(-1)).toBe('paused');
    narration.resume();
    expect(failures).toEqual(['undecodable']);
    expect(statuses.at(-1)).toBe('failed');
  });

  it('ignores a pending play rejection caused by pausing before the audio starts', async () => {
    let reject!: (error: Error) => void;
    const { narration, statuses, fire } = player((audio) =>
      vi.mocked(audio.play).mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      ),
    );
    const heard = narration.interrupt('count', '/intro.mp3');
    narration.pause();
    reject(new DOMException('Interrupted', 'AbortError'));
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses).toEqual(['playing', 'paused']);
    narration.resume();
    fire('ended');
    await expect(heard).resolves.toBe('ended');
  });
});

describe('moving between steps', () => {
  it('stops and forgets an earlier step but keeps the line of the step on screen', async () => {
    const { narration, audio, statuses } = player();
    const previous = narration.interrupt('count', '/count.mp3');
    narration.keep('share');
    await expect(previous).resolves.toBe('cancelled');
    expect(statuses.at(-1)).toBe('silent');
    narration.replay();
    expect(audio().play).toHaveBeenCalledOnce();
    void narration.interrupt('share', '/share.mp3');
    narration.keep('share');
    expect(audio().pause).toHaveBeenCalledOnce();
    expect(statuses.at(-1)).toBe('playing');
  });
});

describe('hearing a line again', () => {
  it('restarts a playing line from its start, and the scene still waits', async () => {
    const { narration, audio, statuses, fire } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    const done = watch(heard);
    fire('playing');
    audio().currentTime = 2;
    narration.replay();
    expect(audio().currentTime).toBe(0);
    expect(audio().load).not.toHaveBeenCalled();
    expect(audio().play).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('playing');
    await vi.advanceTimersByTimeAsync(0);
    expect(done()).toBe(false);
    fire('ended');
    await expect(heard).resolves.toBe('ended');
  });

  it('never cuts a long line short as stalled when it is restarted while playing', async () => {
    const { narration, failures, fire } = player();
    const heard = narration.interrupt('count', '/intro.mp3');
    fire('playing');
    narration.replay();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(failures).toEqual([]);
    fire('ended');
    await expect(heard).resolves.toBe('ended');
  });

  it('plays the last line again once it has ended, and gives way to the next line', async () => {
    const { narration, audio, statuses, fire } = player();
    const first = narration.interrupt('count', '/intro.mp3');
    fire('ended');
    await first;
    narration.replay();
    expect(audio().src).toContain('/intro.mp3');
    const next = narration.interrupt('count', '/next.mp3');
    expect(audio().src).toContain('/next.mp3');
    fire('ended');
    await expect(next).resolves.toBe('ended');
    expect(statuses).toEqual(['playing', 'ready', 'playing', 'playing', 'ready']);
  });

  it('has nothing to replay, pause or continue before any line', () => {
    const { narration, audios, statuses } = player();
    narration.replay();
    narration.pause();
    narration.resume();
    expect(audios).toHaveLength(0);
    expect(statuses).toEqual([]);
  });
});

it('stops and forgets whatever was being said when the lesson closes', async () => {
  const { narration, audio, statuses, fire } = player();
  const heard = narration.interrupt('count', '/intro.mp3');
  narration.close();
  await expect(heard).resolves.toBe('cancelled');
  fire('ended');
  narration.replay();
  expect(audio().play).toHaveBeenCalledOnce();
  expect(statuses.at(-1)).toBe('silent');
});
