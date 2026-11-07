import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { csrfToken, tokenHash } from '../apps/api/src/identity/services/session-security.js';

// The session starts with a password confirmed just now, and the browser's
// password check is answered with that same session. The password check has
// its own browser tests; answering it here keeps this test out of the
// sign-in budget that every browser test shares from one address, while the
// export request, the download and the file are real.
test('parent confirms the password and downloads only their family’s data', async ({
  page,
  baseURL,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated database required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const email = `${family}@example.test`;
  try {
    await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
    await pool.query(
      `WITH parent AS (
         INSERT INTO parents(family_id,email,password_hash,email_verified)
         VALUES($1,$2,'private-password-hash',true) RETURNING id
       )
       INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified,password_verified_at)
       SELECT $3,id,1,1,now()+interval '1 hour',true,clock_timestamp() FROM parent`,
      [family, email, tokenHash(token)],
    );
    await pool.query(
      `INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,'小鹿','小鹿','private-pin-hash',1)`,
      [family],
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
    await page.route('**/api/v1/parents/reauthenticate', (route) =>
      route.fulfill({
        json: {
          role: 'parent',
          email,
          emailVerified: true,
          access: 'verified',
          csrfToken: csrfToken(token),
        },
      }),
    );
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
    expect(file.parent.email).toBe(email);
    expect(file.children.map(({ nickname }) => nickname)).toEqual(['小鹿']);
    expect(text).not.toMatch(/private-|__Host|token/i);
    await expect(panel.getByText(/已下载 family-data-/)).toBeVisible();
    await panel.screenshot({ path: info.outputPath('family-export.png') });
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
