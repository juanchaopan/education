import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { removeFamilies } from './family-cleanup.js';
import { tokenHash } from '../apps/api/src/identity/services/session-security.js';
import { generateRegistrationKey } from '../apps/api/src/identity/services/registration-key.js';

test('child joins using a real key, sees a family code, and cannot reuse it for a second account', async ({
  page,
}, testInfo) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID();
  const key = generateRegistrationKey();
  try {
    await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
    await pool.query(
      "INSERT INTO registration_keys(family_id,key_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [family, tokenHash(key.replaceAll('-', ''))],
    );
    let loseFirstResponse = true;
    await page.route('**/api/v1/children/register', async (route) => {
      if (!loseFirstResponse) return route.continue();
      loseFirstResponse = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      await route.abort();
    });
    await page.goto('/join');
    await page.getByLabel('家长给我的 KEY').fill(key);
    await page.getByLabel('我的昵称').fill('小探索家');
    await page.getByLabel('设置六位数字 PIN').fill('018274');
    await page.getByRole('button', { name: '加入家庭', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('暂时无法确认结果');
    expect(
      (await pool.query('SELECT count(*)::int n FROM children WHERE family_id=$1', [family]))
        .rows[0].n,
    ).toBe(1);
    await page.getByRole('button', { name: '加入家庭', exact: true }).click();
    await expect(page.getByRole('heading', { name: '你已加入家庭！' })).toBeVisible();
    await expect(page.getByLabel('我的家庭码')).toHaveText(
      /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$/,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('joined.png'), fullPage: true });
    await page.reload();
    await page.getByLabel('家长给我的 KEY').fill(key);
    await page.getByLabel('我的昵称').fill('第二个孩子');
    await page.getByLabel('设置六位数字 PIN').fill('018274');
    await page.getByRole('button', { name: '加入家庭', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('已使用');
    expect(
      (await pool.query('SELECT count(*)::int n FROM children WHERE family_id=$1', [family]))
        .rows[0].n,
    ).toBe(1);
  } finally {
    await removeFamilies(pool, [family]);
    await pool.end();
  }
});
