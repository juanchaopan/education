import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useDayNightTheme } from './useDayNightTheme';

const root = document.documentElement;

function preferLessMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }));
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 7, 17, 59, 58) });
  root.dataset.theme = 'day';
  root.style.setProperty('--theme-fade', '1.2s');
  preferLessMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete root.dataset.theme;
  root.removeAttribute('style');
  document.head.innerHTML = '';
});

it('fades into the night theme at 18:00 and settles after the fade', () => {
  renderHook(() => useDayNightTheme());
  expect(root.dataset.theme).toBe('day');
  act(() => vi.advanceTimersByTime(2000));
  expect(root.dataset.theme).toBe('night');
  expect(root.dataset.themeSwitching).toBe('');
  act(() => vi.advanceTimersByTime(1200));
  expect(root.dataset.themeSwitching).toBeUndefined();
});

it('switches at once for a child who asks for less motion', () => {
  preferLessMotion(true);
  renderHook(() => useDayNightTheme());
  act(() => vi.advanceTimersByTime(2000));
  expect(root.dataset.theme).toBe('night');
  expect(root.dataset.themeSwitching).toBeUndefined();
});

it('keeps switching the next morning without a reload', () => {
  renderHook(() => useDayNightTheme());
  act(() => vi.advanceTimersByTime(2000 + 12 * 60 * 60 * 1000));
  expect(root.dataset.theme).toBe('day');
});

it('catches up when the page comes back into view after its timers slept', () => {
  renderHook(() => useDayNightTheme());
  vi.setSystemTime(new Date(2026, 10, 7, 21));
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(root.dataset.theme).toBe('night');
});

it('sets a first theme without fading and paints the browser bar to match', () => {
  delete root.dataset.theme;
  vi.setSystemTime(new Date(2026, 10, 7, 9));
  root.style.setProperty('--bg', '#f3eada');
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
  renderHook(() => useDayNightTheme());
  expect(root.dataset.theme).toBe('day');
  expect(root.dataset.themeSwitching).toBeUndefined();
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#f3eada');
});

it('stops switching once the page lets go of it', () => {
  const { unmount } = renderHook(() => useDayNightTheme());
  unmount();
  act(() => vi.advanceTimersByTime(2000));
  expect(root.dataset.theme).toBe('day');
});
