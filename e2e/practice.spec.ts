import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createProblemRegistry } from '@education/problems/server';
import { buildApp } from '../apps/api/src/app.js';
import { createPracticeAssignments } from '../apps/api/src/practice-application.js';
import { tokenHash } from '../apps/api/src/identity/services/session-security.js';
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

async function seedFamily(pool: pg.Pool, family: string) {
  const children = [randomUUID(), randomUUID()];
  const tokens = children.map(() => randomBytes(32).toString('base64url'));
  const parent = randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'fixture',true) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     SELECT $3,id,1,1,now()+interval '1 hour',true FROM parent`,
    [family, `${family}@example.test`, tokenHash(parent)],
  );
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$3,'小鹿','小鹿','fixture',1),($2,$3,'小猫','小猫','fixture',1)`,
    [...children, family],
  );
  await pool.query(
    `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     VALUES($1,$3,1,1,now()+interval '1 hour'),($2,$4,1,1,now()+interval '1 hour')`,
    [...tokens.map(tokenHash), ...children],
  );
  return { children, tokens, parent };
}

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
  const family = randomUUID();
  // Only this test instance has a fixture registry. Session calls still use the regular web server.
  const registry = createProblemRegistry([{ summary: selected }, { summary: other }]);
  const app = buildApp({ origin: baseURL, practice: createPracticeAssignments(pool, registry) });
  try {
    const { children, tokens, parent } = await seedFamily(pool, family);
    await signInWithToken(page, baseURL!, parent);
    await page.goto('/family');
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
      [children[0]],
    );
    await signInWithToken(page, baseURL!, tokens[0]!);
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

    await signInWithToken(page, baseURL!, tokens[1]!);
    await page.goto('/child');
    await expect(practice.getByText('家长还没有给你安排练习。')).toBeVisible();
    await expect(practice.getByRole('link', { name: '辨认规律' })).toHaveCount(0);
  } finally {
    await app.close();
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
