import { expect, it } from 'vitest';
import { themeScript } from './day-night-theme.ts';

// Runs the script as the page would, against a clock fixed at one moment and
// the family time zone the device keeps, if any, and returns the theme it set
// on the page.
function themeSetAt(moment: Date, kept?: string, storage: 'open' | 'blocked' = 'open') {
  const FixedDate = class extends Date {
    constructor() {
      super(moment);
    }
  };
  const localStorage = {
    getItem: () => {
      if (storage === 'blocked') throw new Error('storage is blocked');
      return kept ?? null;
    },
  };
  const page = { documentElement: { dataset: {} as Record<string, string> } };
  new Function('Date', 'document', 'localStorage', themeScript)(FixedDate, page, localStorage);
  return page.documentElement.dataset.theme;
}

it('picks the day theme for a daytime visit', () => {
  expect(themeSetAt(new Date(2026, 10, 7, 10))).toBe('day');
});

it('picks the night theme for an evening or early-morning visit', () => {
  expect(themeSetAt(new Date(2026, 10, 7, 18))).toBe('night');
  expect(themeSetAt(new Date(2026, 10, 8, 5, 59))).toBe('night');
});

it('follows the clock of the family time zone the device keeps', () => {
  const instant = new Date('2026-11-12T12:15:00Z');
  expect(themeSetAt(instant, 'Asia/Shanghai')).toBe('night');
  expect(themeSetAt(instant, 'America/Toronto')).toBe('day');
});

it('uses the device clock when storage is blocked', () => {
  expect(themeSetAt(new Date(2026, 10, 7, 10), undefined, 'blocked')).toBe('day');
});

it('stands alone, reading nothing from the app', () => {
  expect(themeScript).not.toMatch(/\bimport\b|\brequire\(/);
});
