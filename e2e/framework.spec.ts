import { expect, test } from '@playwright/test';
import type { CatalogResponse } from '@education/contracts';

test('the catalog lists only maintained problems and family navigation works', async ({
  page,
}, testInfo) => {
  const catalog = (await (await page.request.get('/api/v1/problems')).json()) as CatalogResponse;
  expect(catalog.problems.map(({ id }) => id)).toEqual(['garden-balance']);
  await page.goto('/');
  await expect(page.getByRole('list', { name: '题目顺序' }).getByRole('link')).toHaveText([
    '一棵青菜有多重',
  ]);
  await page.screenshot({ path: testInfo.outputPath('explore.png'), fullPage: true });
  await page.getByRole('link', { name: '家长空间' }).click();
  await expect(page.getByRole('heading', { name: '创建家长账号' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '创建家长账号' })).toBeVisible();
});

test('API routes return JSON and do not fall back to the SPA', async ({ request }) => {
  expect((await request.get('/api/v1/problems')).status()).toBe(200);
  expect((await request.get('/api/v1/private-records')).status()).toBe(404);
});
