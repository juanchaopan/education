import { describe, expect, it } from 'vitest';
import { nextSwitch, themeAt, themeSchedule } from './day-night';

const at = (hours: number, minutes = 0, seconds = 0) =>
  new Date(2026, 10, 7, hours, minutes, seconds);

describe('themeAt', () => {
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
});

describe('nextSwitch', () => {
  it('is the coming 6:00 before dawn', () => {
    expect(nextSwitch(at(2, 15), themeSchedule)).toEqual(at(6));
  });

  it('is 18:00 during the day, even a second before it', () => {
    expect(nextSwitch(at(6), themeSchedule)).toEqual(at(18));
    expect(nextSwitch(at(17, 59, 59), themeSchedule)).toEqual(at(18));
  });

  it('is 6:00 the next morning in the evening', () => {
    expect(nextSwitch(at(18), themeSchedule)).toEqual(new Date(2026, 10, 8, 6));
    expect(nextSwitch(at(23, 59), themeSchedule)).toEqual(new Date(2026, 10, 8, 6));
  });

  it('crosses the end of a month', () => {
    expect(nextSwitch(new Date(2026, 10, 30, 20), themeSchedule)).toEqual(new Date(2026, 11, 1, 6));
  });
});
