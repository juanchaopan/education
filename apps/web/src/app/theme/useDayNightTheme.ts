import { useEffect } from 'react';
import { nextSwitch, themeAt, themeFade, themeSchedule } from '../../shared/lib/day-night';

const prefersLessMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// The browser's own bar takes the page colour of the theme on screen.
function paintBrowserBar(root: HTMLElement) {
  const colour = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (colour) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
}

// Keeps the page on the theme for the device's local time while it stays
// open: it switches at the scheduled moment, and checks again whenever the
// page comes back into view, as timers sleep with a hidden page or a device.
// While `data-theme-switching` is set, the stylesheet fades every colour into
// the new theme over `--theme-fade`; a first theme, or a child who asks for
// less motion, gets the new colours at once. Nothing is reloaded or
// re-rendered, so whatever the page holds stays.
export function useDayNightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    let switchTimer: number | undefined;
    let fadeTimer: number | undefined;
    const settle = () => {
      delete root.dataset.themeSwitching;
      root.style.removeProperty('--theme-fade');
    };
    const update = () => {
      const now = new Date();
      const theme = themeAt(now, themeSchedule);
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
      window.clearTimeout(switchTimer);
      switchTimer = window.setTimeout(
        update,
        nextSwitch(now, themeSchedule).getTime() - now.getTime(),
      );
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.clearTimeout(switchTimer);
      window.clearTimeout(fadeTimer);
      settle();
    };
  }, []);
}
