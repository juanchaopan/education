import { expect, test } from '@playwright/test';
import pg from 'pg';
import { familyDeletionPhrase } from '../libs/contracts/src/family-deletion.js';
import { signInRecentParent } from './recent-parent.js';

test('parent types the phrase, confirms the password and deletes the family', async ({
  page,
  baseURL,
}, info) => {
  test.skip(
    !process.env.DATABASE_URL || !process.env.DELETION_LEDGER_URL,
    'Isolated application and deletion ledger databases required',
  );
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const ledger = new pg.Pool({ connectionString: process.env.DELETION_LEDGER_URL });
  let family: string | undefined;
  try {
    family = (await signInRecentParent(page, baseURL!, pool)).family;
    await page.goto('/family');
    const panel = page.getByRole('region', { name: '删除家庭' });
    await expect(panel.getByText('草稿和绘图笔迹')).toBeVisible();
    const remove = panel.getByRole('button', { name: '永久删除家庭' });
    await panel.getByLabel('删除前输入家长密码').fill('any password');
    await expect(remove).toBeDisabled();
    await panel.getByLabel(`输入“${familyDeletionPhrase}”确认`).fill(familyDeletionPhrase);
    await remove.click();
    const deleted = page.getByRole('region', { name: '家庭已删除' });
    await expect(deleted).toBeVisible();
    await deleted.screenshot({ path: info.outputPath('family-deleted.png') });

    const { rowCount } = await pool.query('SELECT 1 FROM families WHERE id=$1', [family]);
    expect(rowCount).toBe(0);
    const entry = await ledger.query(
      'SELECT completed_at IS NOT NULL AS done FROM family_deletions WHERE family_id=$1',
      [family],
    );
    expect(entry.rows).toEqual([{ done: true }]);
    await page.reload();
    await expect(page.getByRole('button', { name: /去登录|去注册/ })).toBeVisible();
  } finally {
    if (family) {
      await pool.query('DELETE FROM families WHERE id=$1', [family]);
      await ledger.query('DELETE FROM family_deletions WHERE family_id=$1', [family]);
    }
    await Promise.all([pool.end(), ledger.end()]);
  }
});
