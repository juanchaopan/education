import { expect, test } from '@playwright/test';

test("the home page is the children's and the parents' sign-in, and family navigation works", async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: '孩子登录' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('我的家庭码', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  await page.getByRole('tab', { name: '家长登录' }).click();
  await expect(page).toHaveURL(/\/\?tab=parent$/);
  await page.getByRole('link', { name: '创建账号' }).click();
  await expect(page.getByRole('heading', { name: '创建家长账号' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '创建家长账号' })).toBeVisible();
});

test('API routes return JSON and do not fall back to the SPA', async ({ request }) => {
  expect((await request.get('/version.json')).status()).toBe(200);
  expect((await request.get('/api/v1/private-records')).status()).toBe(404);
});
