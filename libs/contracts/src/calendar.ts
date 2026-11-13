import { Type, type Static } from '@sinclair/typebox';

// A family's days are counted in the family's own time zone, named the IANA
// way (`Asia/Shanghai`, `America/Toronto`) and never as a fixed offset, so a
// change between winter and summer time follows the zone's own rules. Days
// run from local midnight to local midnight and are found by converting with
// those rules, never by adding 24 hours: a day the clocks change on lasts 23
// or 25 hours. The web pages and the server share these functions.

const timeZoneNameLength = 64;
export const TimeZoneName = Type.String({ minLength: 1, maxLength: timeZoneNameLength });

// A day of the calendar, written YYYY-MM-DD.
export const CalendarDate = Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' });
export type CalendarDate = Static<typeof CalendarDate>;

const zoneName = /^[A-Za-z][A-Za-z0-9_+\-/]*$/;
const formats = new Map<string, Intl.DateTimeFormat>();

// One formatter per zone, kept: building one is far slower than using it.
function wallClock(timeZone: string) {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formats.set(timeZone, format);
  }
  return format;
}

// The zone's usual spelling when the name is one the runtime knows, such as
// `Asia/Shanghai` for `asia/shanghai`; undefined for anything else, including
// an offset like `+08:00`, which would not follow summer time.
export function canonicalTimeZone(name: string): string | undefined {
  if (name.length > timeZoneNameLength || !zoneName.test(name)) return undefined;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: name }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export type LocalTime = { date: CalendarDate; hour: number; minute: number; second: number };

// The date and the time on the wall clock in a zone at an instant. A zone
// the runtime does not know throws a RangeError.
export function localTime(timeZone: string, instant: Date): LocalTime {
  const parts: Record<string, string> = {};
  for (const { type, value } of wallClock(timeZone).formatToParts(instant)) parts[type] = value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export const localDate = (timeZone: string, instant: Date) => localTime(timeZone, instant).date;

const utcNoon = (date: CalendarDate) => Date.parse(`${date}T12:00:00Z`);
const dayLength = 86_400_000;

// Calendar arithmetic on dates alone; no time zone is involved.
export function addDays(date: CalendarDate, days: number): CalendarDate {
  return new Date(utcNoon(date) + days * dayLength).toISOString().slice(0, 10);
}

// How far the zone's wall clock is ahead of UTC at an instant, in whole
// minutes, as milliseconds.
function offsetAt(timeZone: string, instant: number) {
  const { date, hour, minute } = localTime(timeZone, new Date(instant));
  const wall = Date.parse(`${date}T00:00:00Z`) + (hour * 60 + minute) * 60_000;
  return wall - (instant - (instant % 60_000));
}

// The first instant of a day in a zone. Local midnight is found with the
// zone's offset around it; where the clocks jump past midnight, so the day
// has no 00:00, the day starts at the first minute it does have.
export function startOfDay(timeZone: string, date: CalendarDate): Date {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  let instant = midnight - offsetAt(timeZone, midnight);
  instant = midnight - offsetAt(timeZone, instant);
  while (localDate(timeZone, new Date(instant)) < date) instant += 30 * 60_000;
  return new Date(instant);
}
