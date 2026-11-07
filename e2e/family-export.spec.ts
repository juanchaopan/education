import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { signInRecentParent } from './recent-parent.js';

test('parent confirms the password and downloads only their family’s data', async ({
  page,
  baseURL,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let family: string | undefined;
  try {
    const parent = await signInRecentParent(page, baseURL!, pool);
    family = parent.family;
    await page.goto('/family');
    const panel = page.getByRole('region', { name: '导出家庭数据' });
    await expect(panel.getByText('密码和 PIN 的哈希')).toBeVisible();
    await panel.getByLabel('导出前输入家长密码').fill('any password');
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: '确认并下载' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toMatch(/^family-data-\d{4}-\d{2}-\d{2}\.json$/);
    const text = await readFile((await saved.path())!, 'utf8');
    const file = JSON.parse(text) as {
      parent: { email: string };
      children: { nickname: string }[];
    };
    expect(file.parent.email).toBe(parent.email);
    expect(file.children.map(({ nickname }) => nickname)).toEqual(['小鹿']);
    expect(text).not.toMatch(/private-|__Host|token/i);
    await expect(panel.getByText(/已下载 family-data-/)).toBeVisible();
    await panel.screenshot({ path: info.outputPath('family-export.png') });
  } finally {
    if (family) await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
