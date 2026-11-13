import { useEffect } from 'react';
import { themeAt, themeFade, themeSchedule } from '../../shared/lib/day-night';

const prefersLessMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// The browser's own bar takes the page colour of the theme on screen.
function paintBrowserBar(root: HTMLElement) {
  const colour = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (colour) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
}

// How often an open page looks at the clock. Looking every minute, rather than
// waiting for the next switch, keeps a page on time across a change of the
// family's zone or of summer time without working out when that will be.
const checkEvery = 60_000;

// Keeps the page on the theme for the time in the family's time zone, or on
// the device's clock without one, while it stays open: it looks at the clock
// every minute and whenever the page comes back into view, as timers sleep
// with a hidden page or a device. While `data-theme-switching` is set, the
// stylesheet fades every colour into the new theme over `--theme-fade`; a
// first theme, or a child who asks for less motion, gets the new colours at
// once. Nothing is reloaded or re-rendered, so whatever the page holds stays.
export function useDayNightTheme(timeZone?: string) {
  useEffect(() => {
    const root = document.documentElement;
    let fadeTimer: number | undefined;
    const settle = () => {
      delete root.dataset.themeSwitching;
      root.style.removeProperty('--theme-fade');
    };
    const update = () => {
      const theme = themeAt(new Date(), themeSchedule, timeZone);
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
    };
    update();
    const clock = window.setInterval(update, checkEvery);
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.clearInterval(clock);
      window.clearTimeout(fadeTimer);
      settle();
    };
  }, [timeZone]);
}
