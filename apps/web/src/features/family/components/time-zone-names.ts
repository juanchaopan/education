import { localTime } from '@education/contracts';
import { themeAt, themeSchedule } from '../../../shared/lib/day-night';

export type ZoneOption = { zone: string; label: string; offset: number };

function namePart(zone: string, now: Date, timeZoneName: 'longGeneric' | 'longOffset') {
  try {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: zone, timeZoneName })
      .formatToParts(now)
      .find(({ type }) => type === 'timeZoneName')?.value;
  } catch {
    return undefined;
  }
}

// The zone's everyday Chinese name, such as 北美东部时间, or its IANA name
// when the browser has none.
export function zoneName(zone: string, now: Date) {
  return namePart(zone, now, 'longGeneric') ?? zone;
}

// Minutes the zone's clock runs ahead of UTC at this moment, which moves with
// its summer time.
export function zoneOffset(zone: string, now: Date) {
  const match = /([+-])(\d{2}):(\d{2})/.exec(namePart(zone, now, 'longOffset') ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

export function offsetLabel(minutes: number) {
  const sign = minutes < 0 ? '−' : '+';
  const whole = Math.abs(minutes);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `UTC${sign}${pad(Math.floor(whole / 60))}:${pad(whole % 60)}`;
}

// The wall clock in the zone, such as 7:15 or 20:15, and whether the
// family's pages show the day or the night theme at that time.
export function zoneClock(zone: string, now: Date) {
  const { hour, minute } = localTime(zone, now);
  const part = themeAt(now, themeSchedule, zone) === 'day' ? '白天' : '晚上';
  return { time: `${hour}:${String(minute).padStart(2, '0')}`, part };
}

// Every zone a parent can pick, from the westernmost clock to the easternmost
// and by name within one offset, each written like
// 「UTC+08:00 中国标准时间 · Asia/Shanghai」.
export function zoneOptions(zones: Iterable<string>, now: Date): ZoneOption[] {
  return [...new Set(zones)]
    .map((zone) => {
      const offset = zoneOffset(zone, now);
      return { zone, offset, label: `${offsetLabel(offset)} ${zoneName(zone, now)} · ${zone}` };
    })
    .sort((a, b) => a.offset - b.offset || a.zone.localeCompare(b.zone));
}
