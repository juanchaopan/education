import { expect, test } from '@playwright/test';
import pg from 'pg';
import { createProblemRegistry } from '@education/problems/server';
import { buildApp } from '../apps/api/src/app.js';
import { createPracticeAssignments } from '../apps/api/src/practice-application.js';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

const selected = {
  id: 'fixture-pattern',
  version: 2,
  title: '辨认规律',
  grade: '一年级',
  subject: '数学',
  category: '规律',
  sequence: 1,
};
const other = { ...selected, id: 'fixture-shapes', title: '认识图形', sequence: 2 };

test('parent arranges optional practice and only the selected child can open it', async ({
  page,
  baseURL,
}, info) => {
  const database = process.env.DATABASE_URL;
  test.skip(!database, 'Isolated database required');
  if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  await expect
    .poll(async () => (await page.request.get('/health/ready')).status(), { timeout: 15_000 })
    .toBe(200);
  const pool = new pg.Pool({ connectionString: database });
  // Only this test instance has a fixture registry. Session calls still use the regular web server.
  const registry = createProblemRegistry([{ summary: selected }, { summary: other }]);
  const app = buildApp({ origin: baseURL, practice: createPracticeAssignments(pool, registry) });
  const { family, parent, children } = await seedSignedInFamily(pool, ['小鹿', '小猫']);
  const deer = children[0]!;
  const cat = children[1]!;
  try {
    await signInWithToken(page, baseURL!, parent);
    await page.goto('/family/practice');
    const panel = page.getByRole('region', { name: '安排练习' });
    const child = panel.getByLabel('为哪位孩子安排');
    await child.selectOption({ label: '小鹿' });
    // The real catalog and assignments from the production entry point.
    await expect(panel.getByLabel('选择已发布的题目')).toContainText('一棵青菜有多重');
    await expect(panel.getByText('还没有给这位孩子安排练习。')).toBeVisible();

    await page.route('**/api/v1/problems', (route) =>
      route.fulfill({ json: { problems: registry.current } }),
    );
    await page.route('**/api/v1/**/practice**', async (route) => {
      const request = route.request();
      const { pathname, search } = new URL(request.url());
      const result = await app.inject({
        method: request.method() === 'POST' ? 'POST' : 'GET',
        url: pathname + search,
        headers: await request.allHeaders(),
        payload: request.postData() ?? undefined,
      });
      await route.fulfill({
        status: result.statusCode,
        headers: { 'content-type': 'application/json' },
        body: result.body,
      });
    });
    await page.reload();
    await child.selectOption({ label: '小鹿' });
    await panel.getByLabel('选择已发布的题目').selectOption('/problems/fixture-pattern/2');
    await panel.getByRole('button', { name: '加入练习' }).click();
    await expect(panel.getByText('已加入这位孩子的练习。')).toBeVisible();
    await expect(panel.getByText('辨认规律（版本 2）')).toHaveCount(1);
    await panel.getByRole('button', { name: '加入练习' }).click();
    await expect(panel.getByText('已加入这位孩子的练习。')).toBeVisible();
    await expect(panel.getByText('辨认规律（版本 2）')).toHaveCount(1);
    await panel.screenshot({ path: info.outputPath('parent-after.png') });

    await child.selectOption({ label: '小猫' });
    await expect(panel.getByText('还没有给这位孩子安排练习。')).toBeVisible();
    await expect(panel.getByText('辨认规律（版本 2）')).toHaveCount(0);

    await pool.query(
      "INSERT INTO assignments(child_id,problem_id,problem_version) VALUES($1,'fixture-pattern',1)",
      [deer.id],
    );
    await signInWithToken(page, baseURL!, deer.token);
    await page.goto('/child');
    const practice = page.getByRole('region', { name: '我的练习' });
    await expect(practice.getByText('有一道练习的原版本暂时打不开。')).toBeVisible();
    await expect(practice.getByRole('link', { name: '辨认规律' })).toHaveAttribute(
      'href',
      '/problems/fixture-pattern/2',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await practice.screenshot({ path: info.outputPath('child-after.png') });
    await practice.getByRole('link', { name: '辨认规律' }).click();
    await expect(page).toHaveURL(/\/problems\/fixture-pattern\/2$/);
    await page.goBack();
    await practice.getByRole('link', { name: '去题库自由复习' }).click();
    await page.getByRole('link', { name: '认识图形' }).click();
    await expect(page).toHaveURL(/\/problems\/fixture-shapes\/2$/);

    await signInWithToken(page, baseURL!, cat.token);
    await page.goto('/child');
    await expect(practice.getByText('家长还没有给你安排练习。')).toBeVisible();
    await expect(practice.getByRole('link', { name: '辨认规律' })).toHaveCount(0);
  } finally {
    await app.close();
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
