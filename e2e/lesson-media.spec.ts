import { expect, test, type Page } from '@playwright/test';
import { sourceName } from './built-file.js';

// The library pictures a page asks for, by source file name.
function picturesAsked(page: Page) {
  const asked = new Set<string>();
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.webp')) asked.add(sourceName(request.url()));
  });
  return asked;
}

// The backdrop and teacher library holds pictures for every lesson; a child
// downloads only those of the lesson they open, and none while choosing one.
test('the problem list loads no library pictures, and a lesson only its own', async ({ page }) => {
  const asked = picturesAsked(page);
  await page.goto('/');
  const lesson = page.getByRole('link', { name: '一棵青菜有多重' });
  await expect(lesson).toBeVisible();
  expect([...asked]).toEqual([]);

  await lesson.click();
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: '菜园里有两棵青菜' })).toBeVisible();
  await expect.poll(() => [...asked].sort()).toEqual(['garden-morning', 'rabbit']);
});
