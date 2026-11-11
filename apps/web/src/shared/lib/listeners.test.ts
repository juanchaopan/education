import { expect, it, vi } from 'vitest';
import { createListeners } from './listeners';

it('tells every listener of a change until it stops listening', () => {
  const { notify, subscribe } = createListeners();
  const first = vi.fn();
  const second = vi.fn();
  const stop = subscribe(first);
  subscribe(second);
  notify();
  stop();
  notify();
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledTimes(2);
});
