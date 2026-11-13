import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { removeFamilies } from './family-cleanup.js';
import { hashParentPassword } from '../apps/api/src/identity/services/password.js';
import { createChildPin } from '../apps/api/src/identity/services/child-pin.js';

test('parent confirms password, resets a child PIN and the old browser loses access while new credentials work', async ({
  page,
  browser,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID(),
    child = randomUUID(),
    code = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const email = `${randomUUID()}@example.test`,
    password = 'synthetic parent password for child access';
  const pin = '018274',
    nextPin = '937261';
  const childContext = await browser.newContext();
  try {
    await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [family, code]);
    await pool.query(
      'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,true)',
      [family, email, await hashParentPassword(password)],
    );
    await pool.query(
      "INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version) VALUES($1,$2,'小鹿','小鹿',$3,1)",
      [child, family, await createChildPin('ab'.repeat(32))(family, child, pin)],
    );
    // Signing in at the family's page opens that page.
    await page.goto('/family/profile');
    await page.getByRole('button', { name: '已有账号？去登录' }).click();
    await page.getByLabel('登录邮箱').fill(email);
    await page.getByLabel('登录密码').fill(password);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('button', { name: '为小鹿重置 PIN' })).toBeEnabled();
    const childPage = await childContext.newPage();
    await childPage.goto(new URL('/child', page.url()).href);
    await childPage.getByLabel('我的家庭码', { exact: true }).fill(code);
    await childPage.getByLabel('我的昵称', { exact: true }).fill('小鹿');
    await childPage.getByLabel('我的六位 PIN').fill(pin);
    await childPage.getByRole('button', { name: '进入我的空间' }).click();
    await expect(childPage.getByRole('heading', { name: '小鹿，欢迎回来！' })).toBeVisible();
    await pool.query(
      "UPDATE parent_sessions SET password_verified_at=now()-interval '6 minutes' WHERE parent_id=(SELECT id FROM parents WHERE email=$1)",
      [email],
    );
    await page.reload();
    await expect(page.getByRole('button', { name: '为小鹿重置 PIN' })).toBeDisabled();
    await page.getByLabel('重置 PIN 前确认家长密码').fill(password);
    await page
      .getByRole('region', { name: '孩子登录管理' })
      .getByRole('button', { name: '确认密码', exact: true })
      .click();
    await expect(page.getByRole('button', { name: '为小鹿重置 PIN' })).toBeEnabled();
    await page.getByRole('button', { name: '为小鹿重置 PIN' }).click();
    await page.getByLabel('新的六位 PIN', { exact: true }).fill(nextPin);
    await page.getByLabel('再输入一次新 PIN').fill(nextPin);
    await page.getByRole('button', { name: '确认重置并退出旧登录' }).click();
    await expect(page.getByText(/已重置小鹿的 PIN/)).toBeVisible();
    await expect(page.getByLabel('新的六位 PIN', { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath('child-pin-reset-completed.png'),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await childPage.reload();
    await expect(childPage.getByRole('heading', { name: '孩子登录', exact: true })).toBeVisible();
    await childPage.getByLabel('我的六位 PIN').fill(pin);
    await childPage.getByRole('button', { name: '进入我的空间' }).click();
    await expect(childPage.getByRole('alert')).toContainText('PIN 不正确');
    await childPage.getByLabel('我的六位 PIN').fill(nextPin);
    await childPage.getByRole('button', { name: '进入我的空间' }).click();
    await expect(childPage.getByRole('heading', { name: '小鹿，欢迎回来！' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: '为小鹿重置 PIN' })).toBeEnabled();
  } finally {
    await childContext.close();
    await removeFamilies(pool, [family]);
    await pool.end();
  }
});
