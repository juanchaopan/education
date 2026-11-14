import { expect, it } from 'vitest';
import { atStop, nudgedFrom, pushedTo } from './push-run';

const run = { from: 3, stop: 10 };

it('halts a pushed value at the stop however far it is pushed', () => {
  expect(pushedTo(run, 6.04)).toBe(6);
  expect(pushedTo(run, 9.96)).toBe(10);
  expect(pushedTo(run, 25)).toBe(10);
});

it('goes back no further than where the scene began', () => {
  expect(pushedTo(run, 2)).toBe(3);
  expect(pushedTo(run, -4)).toBe(3);
});

it('nudges a value one whole step on or back, within the run', () => {
  expect(nudgedFrom(run, 3, 1)).toBe(4);
  expect(nudgedFrom(run, 4.6, 1)).toBe(5);
  expect(nudgedFrom(run, 4.6, -1)).toBe(4);
  expect(nudgedFrom(run, 5, -1)).toBe(4);
  expect(nudgedFrom(run, 10, 1)).toBe(10);
  expect(nudgedFrom(run, 3, -1)).toBe(3);
});

it('tells when the value stands at the stop', () => {
  expect(atStop(run, 9.9)).toBe(false);
  expect(atStop(run, 10)).toBe(true);
});
