import { expect, it } from 'vitest';
import {
  arrive,
  cucumbersPerApple,
  respond,
  savesProgress,
  tilt,
  type GardenState,
  type Move,
} from './garden-story';
import { shots } from './script';

const leaf: Move = { kind: 'drop', part: 'leaf', place: 'basket' };
const apple: Move = { kind: 'drop', part: 'apple', place: 'basket' };
const exchange: Move = { kind: 'tap', part: 'exchange' };
const replace: Move = { kind: 'tap', part: 'replace' };

function play(state: GardenState, ...moves: Move[]) {
  return moves.reduce((current, move) => respond(current, move)?.state ?? current, state);
}

it('opens with two cabbages balancing six apples, then tips when one cabbage leaves', () => {
  const start = arrive('leaves');
  expect(start.say).toEqual(['hello', 'clue', 'question']);
  expect(tilt(start.state)).toBe(0);
  const lifted = respond(start.state, leaf);
  expect(lifted?.state).toMatchObject({ shot: 'apples', leaves: 1, apples: 6 });
  expect(lifted?.say).toEqual(['tip', 'halve']);
  expect(tilt(lifted!.state)).toBe(33);
});

it('levels the scale as apples leave and moves on when three apples balance one cabbage', () => {
  const tipped = arrive('apples').state;
  const two = play(tipped, apple, apple);
  expect(two.apples).toBe(4);
  expect(tilt(two)).toBe(11);
  const level = respond(two, apple);
  expect(level?.state.apples).toBe(3);
  expect(tilt(level!.state)).toBe(0);
  expect(level).toMatchObject({ say: ['balanced'], then: 'exchange' });
  expect(respond(level!.state, apple)).toBeUndefined();
});

it('shows three cucumbers weighing one apple when the child touches it', () => {
  const single = arrive('exchange').state;
  expect(tilt(single)).toBe(-22);
  const shown = respond(single, exchange);
  expect(shown).toMatchObject({ say: ['three'], then: 'bridge' });
  expect(tilt(shown!.state)).toBe(0);
  expect(respond(shown!.state, exchange)).toBeUndefined();
});

it('swaps each apple for a group of cucumbers with the beam level, then asks for the count', () => {
  const first = respond(arrive('bridge').state, replace);
  expect(first).toMatchObject({ say: ['bridgeOne'], state: { replaced: 1 } });
  const second = respond(first!.state, replace);
  expect(second).toMatchObject({ say: ['bridgeTwo'], state: { replaced: 2 } });
  const counted = respond(second!.state, replace);
  expect(counted).toMatchObject({ say: ['bridgeDone'], state: { shot: 'answer', replaced: 3 } });
  expect(tilt(counted!.state)).toBe(0);
  expect(cucumbersPerApple('answer')).toBe(3);
});

it('lets the apples rest while the child guesses the variation', () => {
  const guessing = arrive('guess');
  expect(guessing.say).toEqual(['change']);
  expect(guessing.state.replaced).toBe(0);
  expect(cucumbersPerApple('guess')).toBe(2);
  expect(respond(guessing.state, replace)).toBeUndefined();
});

it('swaps the apples in twos without saying the total, then asks why', () => {
  expect(arrive('swap').say).toEqual(['swap']);
  const two = play(arrive('swap').state, replace, replace);
  expect(two.replaced).toBe(2);
  expect(respond(arrive('swap').state, replace)?.say).toEqual([]);
  const done = respond(two, replace);
  expect(done).toMatchObject({ say: ['why'], state: { shot: 'reason', replaced: 3 } });
});

it('reveals the variation with every apple swapped in twos', () => {
  expect(arrive('reveal')).toMatchObject({ say: ['reveal'], state: { replaced: 3 } });
  expect(cucumbersPerApple('reveal')).toBe(2);
  expect(respond(arrive('reason').state, replace)).toBeUndefined();
});

it('ignores any move that is not the current prop', () => {
  expect(respond(arrive('leaves').state, apple)).toBeUndefined();
  expect(respond(arrive('apples').state, leaf)).toBeUndefined();
  expect(respond(arrive('bridge').state, exchange)).toBeUndefined();
  expect(respond(arrive('answer').state, replace)).toBeUndefined();
});

it('saves progress up to the answer, and every saved scene can be resumed', () => {
  expect(shots.filter(savesProgress)).toEqual(['leaves', 'apples', 'exchange', 'bridge', 'answer']);
  for (const shot of shots) expect(arrive(shot).state.shot).toBe(shot);
});
