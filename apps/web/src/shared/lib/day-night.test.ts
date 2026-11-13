import { describe, expect, it } from 'vitest';
import { themeAt, themeSchedule } from './day-night';

const at = (hours: number, minutes = 0, seconds = 0) =>
  new Date(2026, 10, 7, hours, minutes, seconds);

describe('themeAt on the device clock', () => {
  it('uses the day theme from 6:00 until just before 18:00', () => {
    expect(themeAt(at(6), themeSchedule)).toBe('day');
    expect(themeAt(at(12), themeSchedule)).toBe('day');
    expect(themeAt(at(17, 59, 59), themeSchedule)).toBe('day');
  });

  it('uses the night theme from 18:00 until just before 6:00', () => {
    expect(themeAt(at(18), themeSchedule)).toBe('night');
    expect(themeAt(at(23, 30), themeSchedule)).toBe('night');
    expect(themeAt(at(0), themeSchedule)).toBe('night');
    expect(themeAt(at(5, 59, 59), themeSchedule)).toBe('night');
  });

  it('falls back to the device clock for a zone the browser does not know', () => {
    expect(themeAt(at(12), themeSchedule, 'Mars/Olympus_Mons')).toBe('day');
  });
});

describe("themeAt on the family's clock", () => {
  it('reads the hour in the family time zone, whatever the device says', () => {
    const instant = new Date('2026-11-12T12:15:00Z');
    expect(themeAt(instant, themeSchedule, 'Asia/Shanghai')).toBe('night');
    expect(themeAt(instant, themeSchedule, 'America/Toronto')).toBe('day');
  });

  it('switches at 6:00 local time on the day the clocks spring forward', () => {
    // America/Toronto is on UTC-4 from 2:00 on 2026-03-08.
    expect(themeAt(new Date('2026-03-08T09:59:00Z'), themeSchedule, 'America/Toronto')).toBe(
      'night',
    );
    expect(themeAt(new Date('2026-03-08T10:00:00Z'), themeSchedule, 'America/Toronto')).toBe('day');
  });

  it('switches at 18:00 local time on the day the clocks fall back', () => {
    // America/Toronto is on UTC-5 from 2:00 on 2026-11-01.
    expect(themeAt(new Date('2026-11-01T22:59:00Z'), themeSchedule, 'America/Toronto')).toBe('day');
    expect(themeAt(new Date('2026-11-01T23:00:00Z'), themeSchedule, 'America/Toronto')).toBe(
      'night',
    );
  });
});
