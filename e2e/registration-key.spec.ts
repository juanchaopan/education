import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashParentPassword } from '../apps/api/src/identity/services/password.js';
const families: string[] = [];
const password = 'a real database synthetic key parent password';
test.afterAll(async () => {
  if (!process.env.DATABASE_URL || !families.length) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  } finally {
    await pool.end();
  }
});
test('verified parent generates, refreshes, reauthenticates, replaces and revokes a key', async ({
  page,
}, testInfo) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const email = `browser-key-${randomUUID()}@example.test`;
  try {
    const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
      .id as string;
    families.push(family);
    await pool.query(
      'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,true)',
      [family, email, await hashParentPassword(password)],
    );
    await page.goto('/family');
    await page.getByRole('button', { name: '已有账号？去登录' }).click();
    await page.getByLabel('登录邮箱').fill(email);
    await page.getByLabel('登录密码').fill(password);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('button', { name: '生成注册 KEY', exact: true }).click();
    const raw = page.getByLabel('本次生成的注册 KEY');
    await expect(raw).toHaveText(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    const value = await raw.textContent();
    await page.reload();
    await expect(page.getByText('待使用', { exact: true })).toBeVisible();
    await expect(raw).toHaveCount(0);
    await pool.query(
      "UPDATE parent_sessions SET password_verified_at=now()-interval '6 minutes' WHERE parent_id IN (SELECT id FROM parents WHERE email=$1)",
      [email],
    );
    await page.getByRole('button', { name: '刷新 KEY 状态' }).click();
    await expect(page.getByLabel('确认家长密码')).toBeVisible();
    await page.getByLabel('确认家长密码').fill('incorrect');
    await page.getByRole('button', { name: '确认密码', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('密码不正确');
    await page.getByLabel('确认家长密码').fill(password);
    await page.getByRole('button', { name: '确认密码', exact: true }).click();
    await expect(page.getByLabel('确认家长密码')).toHaveCount(0);
    await page.getByRole('button', { name: '重新生成注册 KEY' }).click();
    await expect(raw).not.toHaveText(value!);
    await expect(raw).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('registration-key.png'), fullPage: true });
    await page.getByRole('button', { name: '撤销注册 KEY' }).click();
    await expect(page.getByText('已撤销', { exact: true })).toBeVisible();
    await expect(raw).toHaveCount(0);
    await page.getByRole('button', { name: '退出账号' }).click();
    await expect(page.getByRole('heading', { name: '孩子注册 KEY' })).toHaveCount(0);
  } finally {
    await pool.end();
  }
});
