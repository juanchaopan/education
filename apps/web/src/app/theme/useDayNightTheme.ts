import { useEffect } from 'react';
import { themeAt, themeFade, themeSchedule, untilNextSwitch } from '../../shared/lib/day-night';

const prefersLessMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// The browser's own bar takes the page colour of the theme on screen.
function paintBrowserBar(root: HTMLElement) {
  const colour = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (colour) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
}

// The longest an open page goes without looking at the clock. The time to the
// next switch is worked out on the wall clock, which a change of summer time
// can move by an hour, so the page also looks every minute.
const checkEvery = 60_000;

// Keeps the page on the theme for the time in the family's time zone, or on
// the device's clock without one, while it stays open: it switches at the
// scheduled moment, looks at the clock at least every minute, and again
// whenever the page comes back into view, as timers sleep with a hidden page
// or a device. While `data-theme-switching` is set, the stylesheet fades
// every colour into the new theme over `--theme-fade`; a first theme, or a
// child who asks for less motion, gets the new colours at once. Nothing is
// reloaded or re-rendered, so whatever the page holds stays.
export function useDayNightTheme(timeZone?: string) {
  useEffect(() => {
    const root = document.documentElement;
    let clockTimer: number | undefined;
    let fadeTimer: number | undefined;
    const settle = () => {
      delete root.dataset.themeSwitching;
      root.style.removeProperty('--theme-fade');
    };
    const update = () => {
      const now = new Date();
      const theme = themeAt(now, themeSchedule, timeZone);
      if (root.dataset.theme !== theme) {
        const fade = root.dataset.theme !== undefined && !prefersLessMotion();
        root.dataset.theme = theme;
        if (fade) {
          root.style.setProperty('--theme-fade', `${themeFade}ms`);
          root.dataset.themeSwitching = '';
          window.clearTimeout(fadeTimer);
          fadeTimer = window.setTimeout(settle, themeFade);
        }
      }
      paintBrowserBar(root);
      window.clearTimeout(clockTimer);
      const wait = Math.min(checkEvery, untilNextSwitch(now, themeSchedule, timeZone));
      clockTimer = window.setTimeout(update, wait);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.clearTimeout(clockTimer);
      window.clearTimeout(fadeTimer);
      settle();
    };
  }, [timeZone]);
}
