import { expect, test } from '@playwright/test';

test('empty catalog and family navigation reflect actual framework readiness', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '好问题，正在准备中' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始学习' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('explore.png'), fullPage: true });
  await page.getByRole('link', { name: '家长空间' }).click();
  await expect(page.getByRole('heading', { name: '家庭账号即将开放' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '家庭账号即将开放' })).toBeVisible();
});

test('API routes return JSON and do not fall back to the SPA', async ({ request }) => {
  expect((await request.get('/api/v1/problems')).status()).toBe(200);
  expect((await request.get('/api/v1/private-records')).status()).toBe(404);
});
