import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { ReloadReadinessProvider } from '../../../shared/lib/ReloadReadinessProvider';
import { fakeAudio } from '../../../test/fake-audio';
import { silenceWarnings } from '../../../test/silence-warnings';
import type { FilmStory, Reaction } from './lesson-film';
import { useLessonFilm } from './useLessonFilm';

type Shot = 'count' | 'done';
type Line = 'hello' | 'more' | 'aside' | 'bye';
type State = { shot: Shot | 'opening'; taps: number };
type Move = 'next' | 'poke' | 'nothing';

const line = (text: string, clip: string) => ({ text, clip });

function arrive(shot: Shot): Reaction<State, Shot, Line> {
  return { state: { shot, taps: 0 }, say: shot === 'count' ? ['hello'] : ['bye'], chime: [] };
}

const story: FilmStory<State, Shot, Line, Move> = {
  lines: {
    hello: line('数一数', '/hello.mp3'),
    more: line('再来一个', '/more.mp3'),
    aside: line('看这边', '/aside.mp3'),
    bye: line('数完了', '/bye.mp3'),
  },
  opening: { shot: 'opening', taps: 0 },
  first: 'count',
  arrive,
  respond(state, move) {
    const tapped = { ...state, taps: state.taps + 1 };
    if (move === 'next') return { state: tapped, say: ['more'], chime: [], then: 'done' };
    if (move === 'poke') return { state: tapped, say: ['aside'], chime: [] };
  },
};

// The film on a page that is told what a reload would cut off.
function onPage({ children }: PropsWithChildren) {
  return <ReloadReadinessProvider>{children}</ReloadReadinessProvider>;
}

function setup() {
  const { audios, createAudio } = fakeAudio();
  const onArrive = vi.fn();
  const view = renderHook(
    () => ({
      ...useLessonFilm(story, { onArrive, createAudio }),
      page: usePageReadiness().readiness,
    }),
    { wrapper: onPage },
  );
  const player = () => audios[0]!;
  const sound = async (event: 'playing' | 'ended') => {
    await act(async () => {
      player().dispatchEvent(new Event(event));
      await vi.advanceTimersByTimeAsync(400);
    });
  };
  return {
    ...view,
    audios,
    onArrive,
    player,
    sound,
    playing: () => new URL(player().src).pathname,
  };
}

silenceWarnings();
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('starts at the first scene with its lines and tells the page it arrived', async () => {
  const { result, onArrive, playing } = setup();
  expect(result.current.state.shot).toBe('opening');
  await act(async () => result.current.enter());
  expect(result.current.state.shot).toBe('count');
  expect(result.current.caption).toBe('数一数');
  expect(result.current.speaking).toBe(true);
  expect(playing()).toBe('/hello.mp3');
  expect(onArrive).toHaveBeenCalledExactlyOnceWith('count');
});

it('moves to the following scene only once the lines of a move are heard', async () => {
  const { result, onArrive, playing, sound } = setup();
  await act(async () => result.current.enter());
  await sound('ended');
  await act(async () => result.current.act('next'));
  expect(result.current.state).toEqual({ shot: 'count', taps: 1 });
  expect(playing()).toBe('/more.mp3');
  await sound('playing');
  await act(async () => vi.advanceTimersByTimeAsync(20_000));
  expect(result.current.state.shot).toBe('count');
  await sound('ended');
  expect(result.current.state.shot).toBe('done');
  expect(result.current.caption).toBe('数完了');
  expect(onArrive.mock.calls).toEqual([['count'], ['done']]);
});

it('holds the scene on a line that did not come out until the child hears it again', async () => {
  const { result, player, sound } = setup();
  await act(async () => result.current.enter());
  await sound('ended');
  vi.mocked(player().play).mockRejectedValueOnce(new DOMException('', 'NotAllowedError'));
  await act(async () => result.current.act('next'));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(result.current.state.shot).toBe('count');
  expect(result.current.caption).toBe('再来一个');
  expect(result.current.failure).toBe('refused');
  await act(async () => result.current.replay());
  expect(result.current.failure).toBeUndefined();
  await sound('playing');
  await sound('ended');
  expect(result.current.state.shot).toBe('done');
});

it('lets a new move cut in, so the interrupted lines never lead on', async () => {
  const { result, audios, player, playing, sound } = setup();
  await act(async () => result.current.enter());
  await act(async () => result.current.act('next'));
  await act(async () => result.current.act('poke'));
  expect(audios).toHaveLength(1);
  expect(player().pause).toHaveBeenCalled();
  expect(playing()).toBe('/aside.mp3');
  expect(result.current.caption).toBe('看这边');
  await sound('ended');
  await act(async () => vi.advanceTimersByTimeAsync(20_000));
  expect(result.current.state).toEqual({ shot: 'count', taps: 2 });
  expect(playing()).toBe('/aside.mp3');
});

it('ignores a move the scene does not take', async () => {
  const { result, player } = setup();
  await act(async () => result.current.enter());
  const before = result.current.state;
  await act(async () => result.current.act('nothing'));
  expect(result.current.state).toBe(before);
  expect(player().play).toHaveBeenCalledOnce();
});

it('goes straight to a scene, such as a saved one, and starts there', async () => {
  const { result, onArrive, playing } = setup();
  await act(async () => result.current.enter('done'));
  expect(result.current.state.shot).toBe('done');
  expect(playing()).toBe('/bye.mp3');
  await act(async () => result.current.go('count'));
  expect(onArrive.mock.calls).toEqual([['done'], ['count']]);
});

it('stops the voice and says nothing more once the lesson is left', async () => {
  const { result, player, unmount } = setup();
  await act(async () => result.current.enter());
  await act(async () => result.current.act('next'));
  unmount();
  expect(player().pause).toHaveBeenCalled();
  player().dispatchEvent(new Event('ended'));
  await vi.advanceTimersByTimeAsync(20_000);
  expect(player().play).toHaveBeenCalledTimes(2);
});

it('tells the page it is playing from the first line until the lines that lead on are heard', async () => {
  const { result, sound } = setup();
  expect(result.current.page).toBe('ready');
  await act(async () => result.current.enter());
  expect(result.current.page).toBe('playing');
  await sound('ended');
  expect(result.current.page).toBe('ready');
  await act(async () => result.current.act('next'));
  await sound('playing');
  await sound('ended');
  expect(result.current.state.shot).toBe('done');
  expect(result.current.page).toBe('playing');
  await sound('playing');
  await sound('ended');
  expect(result.current.page).toBe('ready');
});

it('is not playing while the child has paused it or a line waits to be heard again', async () => {
  const { result, player, sound } = setup();
  await act(async () => result.current.enter());
  await sound('playing');
  await act(async () => result.current.pause());
  expect(result.current.page).toBe('ready');
  await act(async () => result.current.resume());
  await sound('playing');
  expect(result.current.page).toBe('playing');
  await sound('ended');
  vi.mocked(player().play).mockRejectedValueOnce(new DOMException('', 'NotAllowedError'));
  await act(async () => result.current.act('next'));
  await act(async () => vi.advanceTimersByTimeAsync(1_000));
  expect(result.current.failure).toBe('refused');
  expect(result.current.page).toBe('ready');
});
