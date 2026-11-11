import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFlash } from './useFlash';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('shows nothing before anything has happened', () => {
  const { result } = renderHook(() => useFlash(undefined, 3000));
  expect(result.current).toBe(false);
});

it('shows a moment for its time, then lets it go', () => {
  const { result } = renderHook(() => useFlash(1, 3000));
  expect(result.current).toBe(true);
  act(() => vi.advanceTimersByTime(2999));
  expect(result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe(false);
});

it('shows each new moment for its full time', () => {
  const { result, rerender } = renderHook(({ moment }) => useFlash(moment, 3000), {
    initialProps: { moment: 1 },
  });
  act(() => vi.advanceTimersByTime(2000));
  rerender({ moment: 2 });
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(false);
});
