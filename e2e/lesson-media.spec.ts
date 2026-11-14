import { expect, test, type Page } from '@playwright/test';
import { signInAtTheGardenStart } from './child-at-the-answer.js';
import { sourceName } from './built-file.js';

// The library pictures a page asks for, by source file name.
function picturesAsked(page: Page) {
  const asked = new Set<string>();
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.webp')) asked.add(sourceName(request.url()));
  });
  return asked;
}

// The child's home is painted with its own pictures from the library, by day
// or by night; the backdrop of a lesson downloads only once the child opens
// that lesson.
const homePictures = ['library-corner-rainy', 'rabbit', 'toy-classroom-day'];

test("the child's home loads none of a lesson's pictures, and a lesson only its own", async ({
  page,
}) => {
  await signInAtTheGardenStart(page);
  const asked = picturesAsked(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^学而思/ }).click();
  const lesson = page.getByRole('link', { name: '一棵青菜有多重' });
  await expect(lesson).toBeVisible();
  expect([...asked].filter((picture) => !homePictures.includes(picture))).toEqual([]);

  await lesson.click();
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: '菜园里有两棵青菜' })).toBeVisible();
  await expect.poll(() => asked.has('garden-morning')).toBe(true);
  expect(
    [...asked].filter((picture) => ![...homePictures, 'garden-morning'].includes(picture)),
  ).toEqual([]);
});
