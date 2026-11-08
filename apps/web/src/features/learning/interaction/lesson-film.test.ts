import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { tell, type FilmLine, type Telling } from './lesson-film';
import type { CueResult } from './narration';

type Cue = {
  step: string;
  source?: string;
  start: () => void;
  finish: (result: CueResult) => void;
};

function teller(current: () => boolean = () => true) {
  const cues: Cue[] = [];
  const captions: string[] = [];
  const telling: Telling = {
    voice: {
      interrupt: (step, source, onCue) =>
        new Promise<CueResult>((finish) => {
          cues.push({ step, source, start: () => onCue?.(), finish });
        }),
    },
    step: 'weigh',
    show: (caption) => captions.push(caption),
    current,
  };
  return { telling, cues, captions };
}

const hello: FilmLine = { text: '你好', clip: '/hello.mp3' };
const look: FilmLine = { text: '看这里', clip: '/look.mp3' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('says the lines in order under the scene and waits for each to end', async () => {
  const { telling, cues, captions } = teller();
  const told = tell(telling, [hello, look]);
  await vi.advanceTimersByTimeAsync(0);
  expect(cues.map(({ step, source }) => [step, source])).toEqual([['weigh', '/hello.mp3']]);
  expect(captions).toEqual(['你好']);
  cues[0]!.start();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(cues).toHaveLength(1);
  cues[0]!.finish('ended');
  await vi.advanceTimersByTimeAsync(309);
  expect(cues).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(captions).toEqual(['你好', '看这里']);
  cues[1]!.finish('ended');
  await expect(told).resolves.toBe(true);
});

it('stops where it is once a newer run of lines has taken over', async () => {
  let current = true;
  const { telling, cues } = teller(() => current);
  const told = tell(telling, [hello, look]);
  await vi.advanceTimersByTimeAsync(0);
  current = false;
  cues[0]!.finish('ended');
  await vi.advanceTimersByTimeAsync(1_000);
  await expect(told).resolves.toBe(false);
  expect(cues).toHaveLength(1);
});

it('stops when a line is cancelled', async () => {
  const { telling, cues } = teller();
  const told = tell(telling, [hello, look]);
  await vi.advanceTimersByTimeAsync(0);
  cues[0]!.finish('cancelled');
  await expect(told).resolves.toBe(false);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(cues).toHaveLength(1);
});

it('leaves a caption up long enough to read when its sound cannot play', async () => {
  const { telling, cues } = teller();
  const told = tell(telling, [hello, look]);
  await vi.advanceTimersByTimeAsync(0);
  cues[0]!.finish('unavailable');
  await vi.advanceTimersByTimeAsync(1_500 + 309);
  expect(cues).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(cues).toHaveLength(2);
  cues[1]!.finish('ended');
  await expect(told).resolves.toBe(true);
});

it('stops waiting for a clip that never starts playing', async () => {
  const { telling, cues } = teller();
  const told = tell(telling, [hello]);
  await vi.advanceTimersByTimeAsync(10_999);
  let settled = false;
  void told.then(() => (settled = true));
  await vi.advanceTimersByTimeAsync(0);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expect(told).resolves.toBe(true);
  expect(cues).toHaveLength(1);
});
