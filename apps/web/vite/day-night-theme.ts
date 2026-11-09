import type { Plugin } from 'vite';
import { themeAt, themeSchedule } from '../src/app/theme/schedule.ts';

// A classic script for <head>: it runs before the page's body is drawn and
// sets the theme for the device's local time, so the very first paint already
// has the right colours. It is the app's own `themeAt` called with the app's
// own schedule, so the times live in one place.
export const themeScript = `document.documentElement.dataset.theme=(${themeAt.toString()})(new Date(),${JSON.stringify(themeSchedule)});`;

export function dayNightTheme(): Plugin {
  return {
    name: 'education-day-night-theme',
    transformIndexHtml: () => [{ tag: 'script', children: themeScript, injectTo: 'head' }],
  };
}
