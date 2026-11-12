import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGlide } from './useGlide';

function glide(value = 0, held = false) {
  return renderHook(({ to, holding }) => useGlide(to, { rate: 2, held: holding }), {
    initialProps: { to: value, holding: held },
  });
}

const reduced = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  reduced(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('shows the value it is first drawn with as it is', () => {
  expect(glide(3).result.current).toBe(3);
});

it('travels to a new value at a steady rate, one frame at a time', () => {
  const view = glide(1);
  view.rerender({ to: 3, holding: false });
  expect(view.result.current).toBe(1);
  act(() => vi.advanceTimersByTime(500));
  expect(view.result.current).toBeCloseTo(2, 1);
  act(() => vi.advanceTimersByTime(600));
  expect(view.result.current).toBe(3);
});

it('sets off again from where it is when the value changes on the way', () => {
  const view = glide(0);
  view.rerender({ to: 4, holding: false });
  act(() => vi.advanceTimersByTime(500));
  const between = view.result.current;
  view.rerender({ to: 0, holding: false });
  act(() => vi.advanceTimersByTime(20));
  expect(view.result.current).toBeLessThanOrEqual(between);
  act(() => vi.advanceTimersByTime(2_000));
  expect(view.result.current).toBe(0);
});

it('follows the finger at once while the child holds what moves, and stays there after', () => {
  const view = glide(1);
  view.rerender({ to: 2.5, holding: true });
  expect(view.result.current).toBe(2.5);
  view.rerender({ to: 2.5, holding: false });
  act(() => vi.advanceTimersByTime(100));
  expect(view.result.current).toBe(2.5);
});

it('takes the new value at once when the device asks for less motion', () => {
  reduced(true);
  const view = glide(1);
  view.rerender({ to: 6, holding: false });
  expect(view.result.current).toBe(6);
});
