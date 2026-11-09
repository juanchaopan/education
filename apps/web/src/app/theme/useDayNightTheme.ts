import { useEffect } from 'react';
import { nextSwitch, themeAt, themeSchedule, type Theme, type ThemeSchedule } from './schedule';

const prefersLessMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// How long the colours fade, read from the stylesheet's --theme-fade token so
// the fade and the moment it ends are set in one place.
function fadeMilliseconds(root: HTMLElement) {
  return (parseFloat(getComputedStyle(root).getPropertyValue('--theme-fade')) || 0) * 1000;
}

// The browser's own bar takes the page colour of the theme on screen.
function paintBrowserBar(root: HTMLElement) {
  const colour = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (colour) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
}

// Shows a theme. While `data-theme-switching` is set the stylesheet fades
// every colour into the new theme; a first theme, or a child who asks for
// less motion, gets the new colours at once.
function show(root: HTMLElement, theme: Theme, fade: (done: () => void) => void) {
  const animate = root.dataset.theme !== undefined && !prefersLessMotion();
  root.dataset.theme = theme;
  if (!animate) return;
  root.dataset.themeSwitching = '';
  fade(() => delete root.dataset.themeSwitching);
}

// Keeps the page on the theme for the device's local time while it stays
// open: it switches at the scheduled moment, and checks again whenever the
// page comes back into view, as timers sleep with a hidden page or a device.
// Nothing is reloaded or re-rendered, so whatever the page holds stays.
export function useDayNightTheme(schedule: ThemeSchedule = themeSchedule) {
  useEffect(() => {
    const root = document.documentElement;
    let switchTimer: number | undefined;
    let fadeTimer: number | undefined;
    const fade = (done: () => void) => {
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(done, fadeMilliseconds(root));
    };
    const update = () => {
      const now = new Date();
      const theme = themeAt(now, schedule);
      if (root.dataset.theme !== theme) show(root, theme, fade);
      paintBrowserBar(root);
      window.clearTimeout(switchTimer);
      switchTimer = window.setTimeout(update, nextSwitch(now, schedule).getTime() - now.getTime());
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.clearTimeout(switchTimer);
      window.clearTimeout(fadeTimer);
      delete root.dataset.themeSwitching;
    };
  }, [schedule]);
}
