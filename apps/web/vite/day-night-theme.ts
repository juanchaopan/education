import type { Plugin } from 'vite';
import {
  familyTimeZoneStorage,
  storedTimeZone,
  themeAt,
  themeSchedule,
} from '../src/shared/lib/day-night.ts';

// A classic script for <head>: it runs before the page's body is drawn and
// sets the theme for the time in the family's time zone that this device
// keeps, or on the device's clock before any family has signed in on it, so
// the very first paint already has the right colours. It is the app's own
// `themeAt` and `storedTimeZone` called with the app's own schedule, so the
// times live in one place.
export const themeScript = `document.documentElement.dataset.theme=(${themeAt.toString()})(new Date(),${JSON.stringify(themeSchedule)},(${storedTimeZone.toString()})(${JSON.stringify(familyTimeZoneStorage)}));`;

export function dayNightTheme(): Plugin {
  return {
    name: 'education-day-night-theme',
    transformIndexHtml: () => [{ tag: 'script', children: themeScript, injectTo: 'head' }],
  };
}
