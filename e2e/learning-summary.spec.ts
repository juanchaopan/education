import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { tokenHash } from '../apps/api/src/identity/services/session-security.js';

async function verifiedParentSession(pool: pg.Pool, family: string) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO parents(family_id,email,password_hash,email_verified)
     VALUES($1,$2,'fixture',true) RETURNING id`,
    [family, `${family}@example.test`],
  );
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     VALUES($1,$2,1,1,now()+interval '1 hour',true)`,
    [tokenHash(token), rows[0]!.id],
  );
  return token;
}

test('parent can switch children and see the evidence for a review suggestion', async ({
  page,
  baseURL,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID(),
    learner = randomUUID(),
    sibling = randomUUID();
  try {
    await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
    const token = await verifiedParentSession(pool, family);
    await pool.query(
      `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,$3,'小鹿','小鹿','fixture',1),($2,$3,'小猫','小猫','fixture',1)`,
      [learner, sibling, family],
    );
    await pool.query(
      `INSERT INTO progress(child_id,problem_id,problem_version,round,assisted,incorrect,uncertain)
       VALUES($1,'pattern-practice',1,$2,1,2,1)`,
      [learner, randomUUID()],
    );
    await pool.query(
      `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id)
       VALUES($1,'pattern-practice',1,$2,'observe')`,
      [learner, randomUUID()],
    );
    // Share the real session boundary without consuming the login suite's loopback budget.
    await page.context().addCookies([
      {
        name: '__Host-education_session',
        value: token,
        domain: new URL(baseURL!).hostname,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/family');
    const panel = page.getByRole('region', { name: '学习摘要' });
    const select = panel.getByLabel('选择孩子');
    await expect(select).toHaveValue('');
    await select.selectOption({ label: '小鹿' });
    await expect(panel.getByRole('heading', { name: 'pattern-practice' })).toBeVisible();
    await expect(panel.getByText('优先复习', { exact: true })).toBeVisible();
    await expect(panel.getByText(/这个版本确认答错 2 次/)).toBeVisible();
    await expect(panel.getByText('当前记录不足以判断是否掌握。')).toBeVisible();
    await expect(panel.getByText('提示后完成', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await panel.screenshot({ path: info.outputPath('learning-summary.png') });
    await select.selectOption({ label: '小猫' });
    await expect(panel.getByText('还没有这位孩子的学习记录。')).toBeVisible();
    await expect(panel.getByText('pattern-practice')).toHaveCount(0);
    await page.getByRole('button', { name: '退出账号' }).click();
    await expect(panel).toHaveCount(0);
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
