import { expect, test } from '@playwright/test';
import pg from 'pg';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// A child works on a lesson page for a minute; the parent sees the minute on
// the child's card, picks today and opens the record of that day.
test('the time a child studies shows on the parent card and the record of that day', async ({
  browser,
  baseURL,
}) => {
  const database = process.env.DATABASE_URL;
  test.skip(!database, 'Isolated database required');
  if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  test.setTimeout(180_000);
  const pool = new pg.Pool({ connectionString: database });
  const { family, parent, children } = await seedSignedInFamily(pool, ['小鹿']);
  const childContext = await browser.newContext();
  const parentContext = await browser.newContext();
  try {
    await pool.query(`UPDATE families SET time_zone='Asia/Shanghai' WHERE id=$1`, [family]);
    const lesson = await childContext.newPage();
    await signInWithToken(lesson, baseURL!, children[0]!.token);
    await lesson.goto('/problems/garden-balance/1');
    // Starting the film is the child's first press; the page then sends a
    // heartbeat every half minute while the child has pressed within two.
    await lesson.getByRole('button', { name: /开始短片/ }).click();
    await expect
      .poll(
        async () =>
          (
            await pool.query<{ seconds: number }>(
              'SELECT coalesce(sum(seconds),0)::int AS seconds FROM study_days WHERE child_id=$1',
              [children[0]!.id],
            )
          ).rows[0]!.seconds,
        { timeout: 120_000, intervals: [5_000] },
      )
      .toBeGreaterThanOrEqual(60);
    await lesson.close();

    const page = await parentContext.newPage();
    await signInWithToken(page, baseURL!, parent);
    await page.goto('/family');
    const deer = page.getByRole('region', { name: '小鹿' });
    await expect(deer).toContainText(/今天\s*已学 [1-2] 分钟/);
    await deer.getByRole('button', { name: /日 [1-2] 分钟$/ }).click();
    await expect(deer).toContainText(/年\d+月\d+日\s*已学 [1-2] 分钟/);
    await deer.getByRole('link', { name: '看学习记录' }).click();
    const day = page.getByRole('region', { name: /年\d+月\d+日 周/ });
    await expect(day).toContainText(/已学 [1-2] 分钟/);
    await expect(page.getByRole('region', { name: '学习摘要' })).toContainText(/学了 [1-2] 分钟/);
  } finally {
    await childContext.close();
    await parentContext.close();
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
