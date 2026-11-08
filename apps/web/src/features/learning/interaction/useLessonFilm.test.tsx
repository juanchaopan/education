import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeAudio } from '../../../test/fake-audio';
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

function setup() {
  const { audios, createAudio } = fakeAudio();
  const onArrive = vi.fn();
  const view = renderHook(() => useLessonFilm(story, { onArrive, createAudio }));
  const latest = () => audios.at(-1)!;
  const sound = async (event: 'playing' | 'ended') => {
    await act(async () => {
      latest().dispatchEvent(new Event(event));
      await vi.advanceTimersByTimeAsync(400);
    });
  };
  return {
    ...view,
    audios,
    onArrive,
    latest,
    sound,
    playing: () => new URL(latest().src).pathname,
  };
}

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

it('lets a new move cut in, so the interrupted lines never lead on', async () => {
  const { result, latest, playing, sound } = setup();
  await act(async () => result.current.enter());
  await act(async () => result.current.act('next'));
  const interrupted = latest();
  await act(async () => result.current.act('poke'));
  expect(interrupted.pause).toHaveBeenCalled();
  expect(playing()).toBe('/aside.mp3');
  expect(result.current.caption).toBe('看这边');
  await sound('ended');
  expect(result.current.state).toEqual({ shot: 'count', taps: 2 });
});

it('ignores a move the scene does not take', async () => {
  const { result, audios } = setup();
  await act(async () => result.current.enter());
  const before = result.current.state;
  await act(async () => result.current.act('nothing'));
  expect(result.current.state).toBe(before);
  expect(audios).toHaveLength(1);
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
  const { result, audios, latest, unmount } = setup();
  await act(async () => result.current.enter());
  await act(async () => result.current.act('next'));
  const speaking = latest();
  unmount();
  expect(speaking.pause).toHaveBeenCalled();
  speaking.dispatchEvent(new Event('ended'));
  await vi.advanceTimersByTimeAsync(20_000);
  expect(audios).toHaveLength(2);
});
