import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashParentPassword } from '../apps/api/src/identity/services/password.js';

const families: string[] = [];
test.afterAll(async () => {
  if (!process.env.DATABASE_URL || !families.length) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  } finally {
    await pool.end();
  }
});
for (const verified of [false, true]) {
  test(`parent login, refresh, browser recovery and logout (verified=${verified})`, async ({
    page,
    browser,
  }, testInfo) => {
    test.skip(!process.env.DATABASE_URL, 'An isolated migrated database is required');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const email = `browser-session-${randomUUID()}@example.test`;
    const password = 'a secret browser session testing phrase';
    try {
      const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
        .id as string;
      families.push(family);
      await pool.query(
        'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,$4)',
        [family, email, await hashParentPassword(password), verified],
      );
    } finally {
      await pool.end();
    }
    await page.goto('/family');
    await page.getByRole('button', { name: '已有账号？去登录' }).click();
    await page.getByLabel('登录邮箱').fill(email);
    await page.getByLabel('登录密码').fill('wrong password');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('邮箱或密码不正确');
    await page.getByLabel('登录密码').fill(password);
    await page.screenshot({ path: testInfo.outputPath('parent-login.png'), fullPage: true });
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '我的家长账号' })).toBeVisible();
    await expect(
      page.getByText(verified ? '邮箱已验证' : '邮箱待验证，仅可查看账号验证状态', { exact: true }),
    ).toBeVisible();
    const cookies = await page.context().cookies();
    const cookie = cookies.find((value) => value.name === '__Host-education_session')!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
    await page.reload();
    await expect(page.getByRole('heading', { name: '我的家长账号' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('account-status.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    // No state file is written: only the in-memory browser state crosses contexts.
    const context = await browser.newContext({ storageState: await page.context().storageState() });
    try {
      const restored = await context.newPage();
      await restored.goto('http://127.0.0.1:4173/family');
      await expect(restored.getByRole('heading', { name: '我的家长账号' })).toBeVisible();
      await restored.getByRole('button', { name: '退出账号' }).click();
      await expect(restored.getByRole('heading', { name: '家长登录' })).toBeVisible();
      // The first context still carries the revoked cookie; the server must reject it.
      await page.reload();
      await expect(page.getByRole('heading', { name: '创建家长账号' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '我的家长账号' })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}
