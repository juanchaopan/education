import { Type } from '@sinclair/typebox';

// A family's clock follows the family's own time zone, named the IANA way
// (`Asia/Shanghai`, `America/Toronto`) and never as a fixed offset, so a
// change between winter and summer time follows the zone's own rules. The web
// pages and the server share these functions.

const timeZoneNameLength = 64;
export const TimeZoneName = Type.String({ minLength: 1, maxLength: timeZoneNameLength });

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

// A date written YYYY-MM-DD and the time on a wall clock.
export type LocalTime = { date: string; hour: number; minute: number; second: number };

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
