import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const emails: string[] = [];
test.afterAll(async () => {
  if (!process.env.DATABASE_URL || !emails.length) return;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      'DELETE FROM families WHERE id IN (SELECT family_id FROM parents WHERE email=ANY($1))',
      [emails],
    );
  } finally {
    await pool.end();
  }
});

test('real registration persists a pending parent; duplicate submissions have the same receipt', async ({
  page,
}, testInfo) => {
  test.skip(!process.env.DATABASE_URL, 'A migrated isolated PostgreSQL database is required');
  const email = `browser-${randomUUID()}@example.test`;
  emails.push(email);
  const submit = async () => {
    await page.goto('/family');
    await expect(page.getByRole('button', { name: '提交注册' })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath('registration-form.png'), fullPage: true });
    await page.getByLabel('家长邮箱').fill(email);
    await page.getByLabel('设置密码').fill('a private browser test family phrase');
    await page.getByRole('button', { name: '提交注册' }).click();
    await expect(page.getByRole('heading', { name: '注册申请已受理' })).toBeVisible();
    await expect(page.getByText(/当前版本尚未发送验证邮件/)).toBeVisible();
  };
  await submit();
  await page.screenshot({ path: testInfo.outputPath('registration-receipt.png'), fullPage: true });
  await submit();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query('SELECT email_verified FROM parents WHERE email=$1', [email]);
    expect(result.rows).toEqual([{ email_verified: false }]);
  } finally {
    await pool.end();
  }
  expect((await page.context().cookies()).some((cookie) => cookie.name.includes('session'))).toBe(
    false,
  );
});

test('server failure preserves input and the page fits a touch viewport', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/registration-status', (route) =>
    route.fulfill({ json: { enabled: true } }),
  );
  await page.route('**/api/v1/parents/register', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/family');
  await page.getByLabel('家长邮箱').fill('fixture@example.test');
  await page.getByLabel('设置密码').fill('a private browser test phrase');
  await page.getByRole('button', { name: '提交注册' }).click();
  await expect(page.getByRole('alert')).toHaveText('暂时无法完成注册，请稍后重试。');
  await expect(page.getByLabel('设置密码')).toHaveValue('a private browser test phrase');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('registration-error.png'), fullPage: true });
});
