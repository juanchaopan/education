import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { themeFade } from '../../shared/lib/day-night';
import { useDayNightTheme } from './useDayNightTheme';

const root = document.documentElement;
const minute = 60_000;

function preferLessMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }));
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 7, 17, 59, 30) });
  root.dataset.theme = 'day';
  preferLessMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete root.dataset.theme;
  root.removeAttribute('style');
  document.head.innerHTML = '';
});

it('fades into the night theme within a minute of 18:00 and settles after the fade', () => {
  renderHook(() => useDayNightTheme());
  expect(root.dataset.theme).toBe('day');
  act(() => vi.advanceTimersByTime(minute));
  expect(root.dataset.theme).toBe('night');
  expect(root.dataset.themeSwitching).toBe('');
  expect(root.style.getPropertyValue('--theme-fade')).toBe(`${themeFade}ms`);
  act(() => vi.advanceTimersByTime(themeFade));
  expect(root.dataset.themeSwitching).toBeUndefined();
  expect(root.style.getPropertyValue('--theme-fade')).toBe('');
});

it('switches at once for a child who asks for less motion', () => {
  preferLessMotion(true);
  renderHook(() => useDayNightTheme());
  act(() => vi.advanceTimersByTime(minute));
  expect(root.dataset.theme).toBe('night');
  expect(root.dataset.themeSwitching).toBeUndefined();
});

it('keeps switching the next morning without a reload', () => {
  renderHook(() => useDayNightTheme());
  act(() => vi.advanceTimersByTime(12 * 60 * minute + minute));
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

it("follows the family's clock and moves to a new zone as soon as it is given", () => {
  vi.setSystemTime(new Date('2026-11-12T12:15:00Z'));
  const { rerender } = renderHook(({ zone }) => useDayNightTheme(zone), {
    initialProps: { zone: 'America/Toronto' },
  });
  expect(root.dataset.theme).toBe('day');
  rerender({ zone: 'Asia/Shanghai' });
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
  act(() => vi.advanceTimersByTime(minute));
  expect(root.dataset.theme).toBe('day');
});
