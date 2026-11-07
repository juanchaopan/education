import type { Page } from '@playwright/test';

// Every screenshot is taken at the same moment, so nothing that shows a date
// or a time left changes between runs.
export function fixClock(page: Page) {
  return page.clock.setFixedTime(new Date('2026-11-07T10:00:00+08:00'));
}

// Text is measured and drawn only after the fonts have loaded.
export async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

// Everything a keyboard or a finger can operate.
export const controls =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"]))';
