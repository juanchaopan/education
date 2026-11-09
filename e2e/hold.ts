import type { Locator, Page } from '@playwright/test';

// The middle of an element, once it has been scrolled into view.
export async function centreOf(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Holds the pointer down on `button` while `during` runs, then lets go.
export async function holdWhile(page: Page, button: Locator, during: () => Promise<void>) {
  const { x, y } = await centreOf(button);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await during();
  await page.mouse.up();
}
