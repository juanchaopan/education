import { expect, test, type Page } from '@playwright/test';
import { garden, gardenBook } from './assigned-child.js';
import { gardenApi } from './child-at-the-answer.js';
import { gardenFilm, hearToTheAnswer } from './garden-film.js';
import { listenToNarration } from './narration-check.js';

// A verified parent, whom the test's server answers for: the garden problem
// opens as a preview, and the preview endpoint judges 9 right, as the
// problem's rules do. Returns every request the page made under the problem.
async function signInAsPreviewingParent(page: Page) {
  const asked: string[] = [];
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ status: 401, json: { message: '登录已失效，请重新登录。' } }),
  );
  await page.route('**/api/v1/session', (route) =>
    route.fulfill({
      json: {
        role: 'parent',
        email: 'parent@example.test',
        emailVerified: true,
        access: 'verified',
        csrfToken: 'p'.repeat(43),
      },
    }),
  );
  await page.route(`**${gardenApi}**`, (route) => {
    const { pathname } = new URL(route.request().url());
    asked.push(pathname);
    if (pathname === gardenApi)
      return route.fulfill({ json: { ...garden, mode: 'preview', book: gardenBook.id } });
    if (pathname !== `${gardenApi}/preview`) return route.abort();
    const { input } = route.request().postDataJSON() as { input?: number };
    return route.fulfill({ json: { outcome: input === 9 ? 'independent' : 'incorrect' } });
  });
  return asked;
}

test('a parent previews the garden from its title card to the count, keeping nothing', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const asked = await signInAsPreviewingParent(page);
  const narration = await listenToNarration(page);
  await page.goto('/problems/garden-balance/1');
  await expect(page.getByText('预览模式')).toBeVisible({ timeout: 30_000 });
  await hearToTheAnswer(page, narration);
  await expect(page.getByRole('button', { name: '按住问小兔' })).toHaveCount(0);
  const answer = page.getByRole('region', { name: '说出答案' });
  const numbers = answer.getByRole('group', { name: '点一个数字回答' });
  await numbers.getByRole('button', { name: '8', exact: true }).click();
  await expect(gardenFilm(page).caption).not.toHaveText(/答对了/);
  await numbers.getByRole('button', { name: '9', exact: true }).click();
  await expect(gardenFilm(page).caption).toHaveText(/答对了/);
  await expect(page.getByText('预览模式')).toBeVisible();
  expect(new Set(asked)).toEqual(new Set([gardenApi, `${gardenApi}/preview`]));
});

test('a parent leaves a preview opened directly for the parent space', async ({ page }) => {
  await signInAsPreviewingParent(page);
  await page.route('**/api/v1/parents/**', (route) => route.abort());
  await page.goto('/problems/garden-balance/1');
  await expect(page.getByRole('button', { name: /开始短片/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(/\/family$/);
});
