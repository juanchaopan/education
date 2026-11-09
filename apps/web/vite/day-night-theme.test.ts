import { expect, it } from 'vitest';
import { themeScript } from './day-night-theme.ts';

// Runs the script as the page would, against a clock fixed at one moment, and
// returns the theme it set on the page.
function themeSetAt(moment: Date) {
  const FixedDate = class extends Date {
    constructor() {
      super(moment);
    }
  };
  const page = { documentElement: { dataset: {} as Record<string, string> } };
  new Function('Date', 'document', themeScript)(FixedDate, page);
  return page.documentElement.dataset.theme;
}

it('picks the day theme for a daytime visit', () => {
  expect(themeSetAt(new Date(2026, 10, 7, 10))).toBe('day');
});

it('picks the night theme for an evening or early-morning visit', () => {
  expect(themeSetAt(new Date(2026, 10, 7, 18))).toBe('night');
  expect(themeSetAt(new Date(2026, 10, 8, 5, 59))).toBe('night');
});

it('stands alone, reading nothing from the app', () => {
  expect(themeScript).not.toMatch(/\bimport\b|\brequire\(/);
});
