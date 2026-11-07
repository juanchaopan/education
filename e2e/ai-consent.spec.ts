import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { tokenHash } from '../apps/api/src/identity/services/session-security.js';
import { hashParentPassword } from '../apps/api/src/identity/services/password.js';

test('parent reads both disclosures, confirms their password, grants and revokes separately', async ({
  page,
  baseURL,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const password = 'synthetic password for the consent test';
  try {
    await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
    await pool.query(
      `WITH parent AS (
         INSERT INTO parents(family_id,email,password_hash,email_verified)
         VALUES($1,$2,$3,true) RETURNING id
       )
       INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
       SELECT $4,id,1,1,now()+interval '1 hour',true FROM parent`,
      [family, `${family}@example.test`, await hashParentPassword(password), tokenHash(token)],
    );
    await expect.poll(() => page.request.get('/health/ready').then((r) => r.status())).toBe(200);
    await page.context().addCookies([
      {
        name: '__Host-education_session',
        value: token,
        domain: new URL(baseURL!).hostname,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/family');
    const panel = page.getByRole('region', { name: '外部 AI 授权' });
    await expect(panel.getByText('AI 解题提示预算未设置。')).toBeVisible();
    const tutoring = panel.getByRole('group', { name: 'AI 解题提示' });
    const speech = panel.getByRole('group', { name: '语音转写' });
    const grant = tutoring.getByRole('button', { name: '授权 AI 解题提示' });
    await expect(grant).toBeDisabled();
    await expect(tutoring.getByText(/最多 30 天/)).toBeVisible();
    await expect(speech.getByText(/当前题目步骤里的几个关键词/)).toBeVisible();
    await expect(speech.getByText(/应用不保存原始录音/)).toBeVisible();
    await expect(tutoring.getByText('未授权', { exact: true })).toBeVisible();
    await panel.getByLabel('修改 AI 授权前确认家长密码').fill(password);
    await panel.getByRole('button', { name: '确认密码' }).click();
    await expect(grant).toBeEnabled();
    await grant.click();
    await expect(tutoring.getByText('已授权', { exact: true })).toBeVisible();
    await expect(speech.getByText('未授权', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('granted.png'), fullPage: true });
    await page.reload();
    await expect(tutoring.getByText('已授权', { exact: true })).toBeVisible();
    await tutoring.getByRole('button', { name: '撤回 AI 解题提示授权' }).click();
    await expect(tutoring.getByText('已撤回', { exact: true })).toBeVisible();
    await panel.screenshot({ path: info.outputPath('revoked.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
