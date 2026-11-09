import { expect, it, vi } from 'vitest';
import { createMicrophoneTurn } from './microphone-turn';

it('keeps a held microphone from everyone else until it is given back', () => {
  const turn = createMicrophoneTurn();
  const [held, other] = [Symbol('held'), Symbol('other')];
  const changed = vi.fn();
  turn.subscribe(changed);
  expect(turn.take(held)).toBe(true);
  expect(turn.blocks(other)).toBe(true);
  expect(turn.blocks(held)).toBe(false);
  expect(turn.take(other)).toBe(false);
  turn.give(other);
  expect(turn.blocks(other)).toBe(true);
  turn.give(held);
  expect(turn.blocks(other)).toBe(false);
  expect(changed).toHaveBeenCalledTimes(2);
});

it('takes the microphone from a page listening on its own, which is told to stop', () => {
  const turn = createMicrophoneTurn();
  const [listening, held] = [Symbol('listening'), Symbol('held')];
  const stop = vi.fn(() => turn.give(listening));
  expect(turn.take(listening, stop)).toBe(true);
  expect(turn.blocks(held)).toBe(false);
  expect(turn.take(held)).toBe(true);
  expect(stop).toHaveBeenCalledOnce();
  expect(turn.blocks(listening)).toBe(true);
  expect(turn.take(listening, stop)).toBe(false);
});
