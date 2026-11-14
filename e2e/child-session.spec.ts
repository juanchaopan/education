import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { removeFamilies } from './family-cleanup.js';
import { createChildPin } from '../apps/api/src/identity/services/child-pin.js';

test('child signs in, returns across browser contexts, remembers only the locator, and logs out everywhere for that token', async ({
  page,
  browser,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID(),
    child = randomUUID();
  const code = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const pin = '018274';
  const myBooks = (target = page) => target.getByRole('heading', { name: '我的书', level: 1 });
  try {
    await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [family, code]);
    await pool.query(
      `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
      VALUES($1,$2,'小鹿','小鹿',$3,1)`,
      [child, family, await createChildPin('ab'.repeat(32))(family, child, pin)],
    );
    await page.goto('/');
    await page.getByLabel('我的家庭码', { exact: true }).fill(code);
    await page.getByLabel('我的昵称', { exact: true }).fill('小鹿');
    await page.getByLabel('我的六位 PIN').fill('937261');
    await page.getByRole('button', { name: '进入我的空间' }).click();
    await expect(page.getByRole('alert')).toContainText('家庭码、昵称或 PIN 不正确');
    await expect(page.getByLabel('我的六位 PIN')).toHaveValue('');
    await page.getByLabel('我的六位 PIN').fill(pin);
    await page.getByRole('button', { name: '进入我的空间' }).click();
    await expect(myBooks()).toBeVisible();
    await expect(page.getByText('家长还没有给你安排书')).toBeVisible();
    const cookie = (await page.context().cookies()).find(
      (value) => value.name === '__Host-education_session',
    )!;
    expect(cookie).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 179 * 86400);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(pin);
    await page.reload();
    await expect(myBooks()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('child-home.png'), fullPage: true });
    const restored = await browser.newContext({
      storageState: await page.context().storageState(),
    });
    try {
      const next = await restored.newPage();
      await next.goto(new URL('/child', page.url()).href);
      await expect(myBooks(next)).toBeVisible();
      await expect(next).toHaveURL(/\/$/);
      await next.getByRole('button', { name: /小鹿/ }).click();
      await next.getByRole('menuitem', { name: '退出登录' }).click();
      await expect(next.getByRole('tab', { name: '孩子登录' })).toBeVisible();
      await expect(next.getByLabel('我的家庭码', { exact: true })).toHaveValue(code);
      await expect(next.getByLabel('我的昵称', { exact: true })).toHaveValue('小鹿');
      await expect(next.getByLabel('我的六位 PIN')).toHaveValue('');
      await page.reload();
      await expect(page.getByRole('tab', { name: '孩子登录' })).toBeVisible();
      await page.screenshot({ path: info.outputPath('child-login.png'), fullPage: true });
    } finally {
      await restored.close();
    }
  } finally {
    await removeFamilies(pool, [family]);
    await pool.end();
  }
});

test('remembered family and nickname never authenticate, and limited or unavailable login offers a patient retry', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'education-child-locator',
      JSON.stringify({ familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿' }),
    ),
  );
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  let attempts = 0;
  await page.route('**/api/v1/children/login', (route) => {
    attempts++;
    return route.fulfill({ status: 429, json: {} });
  });
  await page.goto('/');
  await expect(page.getByRole('tab', { name: '孩子登录' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByLabel('我的六位 PIN').fill('018274');
  await page.getByRole('button', { name: '进入我的空间' }).click();
  await expect(page.getByRole('alert')).toContainText('休息一会儿再试');
  expect(attempts).toBe(1);
  await expect(page.getByLabel('我的家庭码', { exact: true })).toHaveValue('ABCD-EFGH-JKMN');
  await expect(page.getByLabel('我的六位 PIN')).toHaveValue('');
  await page.getByRole('switch', { name: '在这台设备上记住家庭码和昵称' }).uncheck();
  expect(await page.evaluate(() => localStorage.getItem('education-child-locator'))).toBeNull();
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('暂时无法确认登录状态');
  await expect(page.getByRole('heading', { name: '我的书' })).toHaveCount(0);
});
