import { describe, expect, it } from 'vitest';
import { canonicalTimeZone, localTime } from './calendar.js';

const toronto = 'America/Toronto';
const shanghai = 'Asia/Shanghai';

describe('a family time zone name', () => {
  it('takes IANA names in their usual spelling', () => {
    expect(canonicalTimeZone('Asia/Shanghai')).toBe('Asia/Shanghai');
    expect(canonicalTimeZone('america/toronto')).toBe('America/Toronto');
    expect(canonicalTimeZone('UTC')).toBe('UTC');
  });

  it('turns away offsets, unknown names and names longer than 64 characters', () => {
    expect(canonicalTimeZone('+08:00')).toBeUndefined();
    expect(canonicalTimeZone('UTC+8')).toBeUndefined();
    expect(canonicalTimeZone('Mars/Olympus_Mons')).toBeUndefined();
    expect(canonicalTimeZone('')).toBeUndefined();
    expect(canonicalTimeZone(`Asia/${'x'.repeat(60)}`)).toBeUndefined();
  });
});

describe('the wall clock of an instant', () => {
  it('reads the clock of the zone, not of the device', () => {
    const instant = new Date('2026-11-12T20:30:15Z');
    expect(localTime(shanghai, instant)).toEqual({
      date: '2026-11-13',
      hour: 4,
      minute: 30,
      second: 15,
    });
    expect(localTime(toronto, instant)).toEqual({
      date: '2026-11-12',
      hour: 15,
      minute: 30,
      second: 15,
    });
  });

  it('starts a new day at local midnight', () => {
    expect(localTime(shanghai, new Date('2026-11-12T15:59:59Z')).date).toBe('2026-11-12');
    expect(localTime(shanghai, new Date('2026-11-12T16:00:00Z')).date).toBe('2026-11-13');
  });
});
