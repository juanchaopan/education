import type { Page } from '@playwright/test';

export type Theme = 'day' | 'night';

// The moments screenshots are taken at: a morning for the day theme and an
// evening for the night theme. Nothing that shows a date or a time left
// changes between runs.
const moments: Record<Theme, Date> = {
  day: new Date('2026-11-07T10:00:00+08:00'),
  night: new Date('2026-11-07T20:00:00+08:00'),
};

export function fixClock(page: Page, theme: Theme = 'day') {
  return page.clock.setFixedTime(moments[theme]);
}

// Text is measured and drawn only after the fonts have loaded.
export async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

// Everything a keyboard or a finger can operate.
export const controls =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"]))';
