import { localTime } from '@education/contracts';

export type Theme = 'day' | 'night';

export type ThemeSchedule = { readonly dayStarts: number; readonly nightStarts: number };

// When the site switches between its two themes, as whole hours of the
// family's local time: the day theme from `dayStarts` until `nightStarts`,
// the night theme for the rest. This is the only place the times are set; the
// script that picks the theme before the first paint is built from it.
export const themeSchedule: ThemeSchedule = { dayStarts: 6, nightStarts: 18 };

// How long an open page takes to fade from one theme into the other, in
// milliseconds. The page hands it to the stylesheet while it switches.
export const themeFade = 1200;

// Where this device keeps the time zone of the family last signed in on it,
// so the very first paint already follows the family's clock.
export const familyTimeZoneStorage = 'education-family-time-zone';

// The theme for a moment on the clock of a time zone, which follows the zone's
// summer time, or on the device's own clock without one or for a zone the
// browser does not know. It reads nothing but its arguments, so the page can
// also run it as a standalone script before anything else loads.
export function themeAt(date: Date, schedule: ThemeSchedule, timeZone?: string): Theme {
  let hour = date.getHours();
  if (timeZone) {
    try {
      const clock = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23',
      });
      hour = Number(clock.format(date));
    } catch {
      hour = date.getHours();
    }
  }
  return hour >= schedule.dayStarts && hour < schedule.nightStarts ? 'day' : 'night';
}

// The family time zone this device keeps, if any. Like `themeAt` it stands
// alone, and storage a browser refuses reads as nothing kept.
export function storedTimeZone(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

const dayLength = 86_400_000;

// The time of day on the zone's wall clock, or the device's for no zone or
// one the browser does not know, in milliseconds since midnight.
function timeOfDay(date: Date, timeZone?: string) {
  let clock = { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
  if (timeZone) {
    try {
      clock = localTime(timeZone, date);
    } catch {
      // A zone the browser does not know leaves the device's clock.
    }
  }
  return ((clock.hour * 60 + clock.minute) * 60 + clock.second) * 1000 + date.getMilliseconds();
}

// How long until the wall clock next reaches the start of the day or of the
// night theme. On a day the clocks change it can be an hour off, so a page
// also looks at the clock every minute.
export function untilNextSwitch(date: Date, schedule: ThemeSchedule, timeZone?: string) {
  const now = timeOfDay(date, timeZone);
  return Math.min(
    ...[schedule.dayStarts, schedule.nightStarts].map(
      (hour) => (hour * 3_600_000 - now + dayLength) % dayLength || dayLength,
    ),
  );
}
