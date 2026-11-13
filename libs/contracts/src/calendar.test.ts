import { describe, expect, it } from 'vitest';
import { addDays, canonicalTimeZone, localDate, localTime, startOfDay } from './calendar.js';

const toronto = 'America/Toronto';
const shanghai = 'Asia/Shanghai';
const hours = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3_600_000;
const dayLength = (zone: string, date: string) =>
  hours(startOfDay(zone, date), startOfDay(zone, addDays(date, 1)));

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
    expect(localDate(shanghai, new Date('2026-11-12T15:59:59Z'))).toBe('2026-11-12');
    expect(localDate(shanghai, new Date('2026-11-12T16:00:00Z'))).toBe('2026-11-13');
  });
});

describe('day boundaries', () => {
  it('lasts 24 hours every day in a zone without summer time', () => {
    expect(startOfDay(shanghai, '2026-11-12')).toEqual(new Date('2026-11-11T16:00:00Z'));
    expect(dayLength(shanghai, '2026-03-08')).toBe(24);
    expect(dayLength(shanghai, '2026-11-01')).toBe(24);
  });

  it('lasts 23 hours on the day the clocks spring forward', () => {
    expect(startOfDay(toronto, '2026-03-08')).toEqual(new Date('2026-03-08T05:00:00Z'));
    expect(startOfDay(toronto, '2026-03-09')).toEqual(new Date('2026-03-09T04:00:00Z'));
    expect(dayLength(toronto, '2026-03-08')).toBe(23);
  });

  it('lasts 25 hours on the day the clocks fall back', () => {
    expect(startOfDay(toronto, '2026-11-01')).toEqual(new Date('2026-11-01T04:00:00Z'));
    expect(startOfDay(toronto, '2026-11-02')).toEqual(new Date('2026-11-02T05:00:00Z'));
    expect(dayLength(toronto, '2026-11-01')).toBe(25);
  });

  it('starts a day without a midnight at its first minute', () => {
    // Santiago moved its clocks from 00:00 to 01:00 on 2026-09-06.
    const start = startOfDay('America/Santiago', '2026-09-06');
    expect(localTime('America/Santiago', start)).toEqual({
      date: '2026-09-06',
      hour: 1,
      minute: 0,
      second: 0,
    });
  });
});

describe('calendar dates', () => {
  it('counts whole days across months, years and clock changes', () => {
    expect(addDays('2026-11-12', -6)).toBe('2026-11-06');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
  });
});
