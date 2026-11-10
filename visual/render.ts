import { expect, type Locator, type Page } from '@playwright/test';

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

// Every CSS animation and transition of the pages the test opens ends the
// moment it starts: a finite animation shows its last frame, an endless one
// its resting state, so no screenshot depends on how far a movement had got.
// Called before the page is opened, and only by the tests that take
// screenshots: the motion checks in accessibility.spec.ts look at the motion
// the site really has. Why the screenshot conditions are what they are:
// docs/design/visual-baselines.md.
export function holdStill(page: Page) {
  return page.addInitScript(() => {
    const still = new CSSStyleSheet();
    still.replaceSync(`*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, still];
  });
}

// The pictures the page loads straight away as <img> have loaded and been
// decoded, and the fonts are ready, so text is measured and the pictures are
// drawn in full. A picture drawn as a CSS background is not seen here; a
// late one changes the screenshot, which then fails as unstable.
export function waitForPicturesAndFonts(page: Page) {
  return page.evaluate(() =>
    Promise.all([
      document.fonts.ready,
      ...[...document.images]
        .filter((image) => image.loading !== 'lazy' || image.complete)
        .map((image) => image.decode().catch(() => undefined)),
    ]),
  );
}

// Lays out and paints the whole finished page afresh, so the screenshot
// depends on the page alone and not on which parts were painted earlier,
// while the page was still filling in. Hiding the page takes focus away, so
// the focused element gets it back. Returns what still moves once the new
// paint is on screen, such as an animation a script started.
function paintAfresh(page: Page) {
  return page.evaluate(async () => {
    const root = document.documentElement;
    const focused = document.activeElement;
    root.style.display = 'none';
    void root.offsetHeight;
    root.style.removeProperty('display');
    if (focused instanceof HTMLElement || focused instanceof SVGElement)
      focused.focus({ preventScroll: true });
    await new Promise((painted) => requestAnimationFrame(() => requestAnimationFrame(painted)));
    return document
      .getAnimations()
      .filter((animation) => animation.playState === 'running')
      .map((animation) => (animation.effect as KeyframeEffect | null)?.target?.nodeName ?? '?');
  });
}

// Compares the whole page, or the part of it given, with its reviewed
// baseline once the page has been painted afresh and nothing on it moves.
export async function expectScreenshot(page: Page, name: string, part?: Locator) {
  expect(await paintAfresh(page), 'animations still running').toEqual([]);
  if (part) await expect(part).toHaveScreenshot(name);
  else await expect(page).toHaveScreenshot(name, { fullPage: true });
}

// Everything a keyboard or a finger can operate.
export const controls =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"]))';
