import { describe, expect, it } from 'vitest';
import { themeAt, themeSchedule, untilNextSwitch } from './day-night';

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

describe('untilNextSwitch', () => {
  const hour = 3_600_000;

  it('counts to the coming 6:00 or 18:00 on the device clock', () => {
    expect(untilNextSwitch(at(2, 15), themeSchedule)).toBe(3.75 * hour);
    expect(untilNextSwitch(at(17, 59, 59), themeSchedule)).toBe(1000);
    expect(untilNextSwitch(at(18), themeSchedule)).toBe(12 * hour);
  });

  it("counts on the family's clock in its zone", () => {
    // 20:15 in China, 7:15 in Toronto.
    const instant = new Date('2026-11-12T12:15:00Z');
    expect(untilNextSwitch(instant, themeSchedule, 'Asia/Shanghai')).toBe(9.75 * hour);
    expect(untilNextSwitch(instant, themeSchedule, 'America/Toronto')).toBe(10.75 * hour);
  });
});
