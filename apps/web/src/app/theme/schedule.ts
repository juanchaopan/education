export type Theme = 'day' | 'night';

export type ThemeSchedule = { readonly dayStarts: number; readonly nightStarts: number };

// When the site switches between its two themes, as whole hours of the
// device's local time: the day theme from `dayStarts` until `nightStarts`,
// the night theme for the rest. This is the only place the times are set; the
// script that picks the theme before the first paint is built from it.
export const themeSchedule: ThemeSchedule = { dayStarts: 6, nightStarts: 18 };

// How long an open page takes to fade from one theme into the other, in
// milliseconds. The page hands it to the stylesheet while it switches.
export const themeFade = 1200;

// The theme for a moment. It reads nothing but its arguments, so the page can
// also run it as a standalone script before anything else loads.
export function themeAt(date: Date, schedule: ThemeSchedule): Theme {
  const hour = date.getHours();
  return hour >= schedule.dayStarts && hour < schedule.nightStarts ? 'day' : 'night';
}

// The next moment the theme changes after `date`, in local time, so a
// daylight-saving change moves it with the clock on the wall.
export function nextSwitch(date: Date, schedule: ThemeSchedule): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  const hour = date.getHours();
  if (hour < schedule.dayStarts) {
    next.setHours(schedule.dayStarts);
  } else if (hour < schedule.nightStarts) {
    next.setHours(schedule.nightStarts);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(schedule.dayStarts);
  }
  return next;
}
