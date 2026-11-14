import { ScenePicture } from '@education/contracts';
import { declaresAction, pictureProblems } from '@education/problems/lesson-content';
import { railChaseLesson } from '@education/problems/lessons/rail-chase';
import { Value } from '@sinclair/typebox/value';
import { expect, it } from 'vitest';
import { boardSteps } from './rail-board';
import { railRecording } from './rail-record';
import { arrive, opening, respond, runs, type Move, type Part, type RailState } from './rail-story';
import { shots, type Shot } from './script';

const { picture, action } = railRecording;
const at = (shot: Shot) => arrive(shot).state;
const tap = (part: Part): Move => ({ kind: 'tap', part });
const drive = (to: number): Move => ({ kind: 'drive', to });
const thingsOf = (state: RailState) =>
  Object.fromEntries(
    picture(state).things.map(({ place, thing, count }) => [`${place}/${thing}`, count]),
  );

// What the record says of one move from a state: its key action, if any.
const actionOf = (state: RailState, move: Move) => action(state, move, !!respond(state, move));

// Every state a scene shows: as it arrives, after each of its taps, and at
// its stop.
function statesOf(shot: Shot): RailState[] {
  const first = at(shot);
  const stop = runs[shot]?.stop;
  return [
    first,
    ...[1, 2].map((taps) => ({ ...first, taps })),
    ...(stop === undefined ? [] : [{ ...first, t: stop, stopped: true }]),
  ];
}

it('tells every state of every scene in words its content declares, within the request', () => {
  for (const state of shots.flatMap(statesOf)) {
    const shown = picture(state);
    expect(pictureProblems(railChaseLesson, shown)).toEqual([]);
    expect(Value.Check(ScenePicture, shown)).toBe(true);
  }
  expect(picture(opening)).toEqual({ things: [], states: [] });
});

it('declares a board state for every step the derivation board writes', () => {
  for (const step of Object.keys(boardSteps))
    expect(Object.keys(railChaseLesson.recordWords.states)).toContain(`board-${step}`);
});

it('shows the seconds, the speeds and who is in front, with the board once it writes', () => {
  expect(picture(at('speed'))).toEqual({
    things: [
      { place: 'tracks', thing: 'second', count: 0 },
      { place: 'yellow-car', thing: 'square-a-second', count: 2 },
      { place: 'blue-car', thing: 'square-a-second', count: 1 },
    ],
    states: ['blue-in-front'],
  });
  expect(picture({ ...at('one-second'), t: 1, stopped: true }).states).toEqual([
    'blue-in-front',
    'board-rate',
  ]);
  expect(picture({ ...at('name-t'), taps: 1 }).states).toEqual(['blue-in-front', 'board-rest']);
  expect(picture({ ...at('catch-up'), t: 10, stopped: true }).states).toEqual([
    'lined-up',
    'board-zero',
  ]);
});

it('counts the squares between the midpoints and the gold squares of the start strip', () => {
  expect(thingsOf({ ...at('start-gap'), taps: 1 })).toMatchObject({
    'between/square': 10,
    'start-strip/gold-square': 0,
    'start-strip/plain-square': 10,
  });
  expect(thingsOf({ ...at('three-seconds'), t: 3, stopped: true })).toMatchObject({
    'tracks/second': 3,
    'between/square': 7,
    'start-strip/gold-square': 3,
    'start-strip/plain-square': 7,
  });
  expect(thingsOf({ ...at('distance'), t: 12, stopped: true })).toMatchObject({
    'between/square': 2,
  });
  expect(picture({ ...at('distance'), t: 12, stopped: true }).states[0]).toBe('yellow-in-front');
});

it('shows both cases, the lit pictures, and four squares apart at each time', () => {
  const ways = picture({ ...at('two-ways'), taps: 2 });
  expect(ways.things).toContainEqual({ place: 'side-pictures', thing: 'lit-picture', count: 2 });
  expect(ways.states).toEqual(['yellow-in-front', 'board-blue-ahead', 'board-yellow-ahead']);
  expect(picture({ ...at('check-six'), t: 6, stopped: true }).states).toEqual([
    'blue-in-front',
    'board-six',
    'four-apart-mark',
  ]);
  const faster = picture({ ...at('vary-seven'), t: 7, stopped: true });
  expect(faster.things).toContainEqual({ place: 'yellow-car', thing: 'square-a-second', count: 3 });
  expect(faster.states).toEqual(['yellow-in-front', 'board-faster-equation']);
});

it('names each push and tap the scene takes', () => {
  expect(actionOf(at('one-second'), drive(1))).toBe('push');
  expect(actionOf(at('one-second'), tap('yellow-car'))).toBe('push');
  expect(actionOf(at('speed'), tap('yellow-car'))).toBe('tap-yellow-car');
  expect(actionOf(at('start-gap'), tap('start-gap'))).toBe('tap-start-gap');
  expect(actionOf(at('equation'), tap('four'))).toBe('tap-four');
  expect(actionOf({ ...at('two-ways'), taps: 1 }, tap('yellow-ahead'))).toBe('tap-yellow-ahead');
});

it('names the common slips: pushing stopped or still cars, and tapping out of turn', () => {
  expect(actionOf({ ...at('one-second'), t: 1, stopped: true }, drive(2))).toBe('push-at-stop');
  expect(actionOf(at('equation'), drive(13))).toBe('push-still');
  expect(actionOf(at('two-ways'), tap('yellow-ahead'))).toBe('wrong-tap');
  expect(actionOf(at('equation'), tap('gap'))).toBe('wrong-tap');
  expect(actionOf(at('one-second'), drive(0))).toBeUndefined();
  expect(actionOf(opening, tap('yellow-car'))).toBeUndefined();
});

it('declares every key action it names', () => {
  const moves: Move[] = [drive(1), tap('yellow-car'), tap('four'), tap('gap')];
  for (const state of shots.flatMap(statesOf))
    for (const move of moves) {
      const named = actionOf(state, move);
      if (named) expect(declaresAction(railChaseLesson, named)).toBe(true);
    }
});
