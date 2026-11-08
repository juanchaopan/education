import { expect, test, type Locator, type Page } from '@playwright/test';
import pg from 'pg';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// The first real problem from the production entry point: the catalog places
// it, a signed-in child plays every scene by dragging and tapping, the place
// is saved, and the final count is judged on the server. The browser here has
// no microphone and the server no AI key, so the answer falls back to tapping
// a number and a question gets the scene's own guidance.

async function drag(page: Page, source: Locator, target: Locator) {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 10, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

// From the first cabbage to the question of the count, every scene by hand.
async function playToTheAnswer(page: Page) {
  const film = page.getByRole('region', { name: '菜园天平互动短片' });
  const basket = film.getByRole('button', { name: '旁边的篮子' });
  const apples = film.getByRole('button', { name: '苹果' });
  await drag(page, film.getByRole('button', { name: '青菜' }).first(), basket);
  await expect(apples).toHaveCount(6);
  for (const left of [5, 4]) {
    await drag(page, apples.last(), basket);
    await expect(apples).toHaveCount(left);
  }
  await drag(page, apples.last(), basket);
  await expect(film.getByRole('status')).toHaveText(/碰一碰这个苹果/, { timeout: 20_000 });
  await apples.click();
  const replace = film.getByRole('button', { name: '把这个苹果换成黄瓜' });
  for (let swapped = 0; swapped < 3; swapped++) await replace.click({ timeout: 20_000 });
  await expect(page.getByRole('region', { name: '说出答案' })).toBeVisible();
}

test('a child places the garden problem, resumes it and is judged on the counted answer', async ({
  page,
  baseURL,
}, info) => {
  const database = process.env.DATABASE_URL;
  test.skip(!database, 'Isolated database required');
  if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  test.setTimeout(120_000);
  await expect
    .poll(async () => (await page.request.get('/health/ready')).status(), { timeout: 15_000 })
    .toBe(200);
  const pool = new pg.Pool({ connectionString: database });
  const { family, parent, children } = await seedSignedInFamily(pool, ['小鹿']);
  try {
    await signInWithToken(page, baseURL!, children[0]!.token);
    await page.goto('/');
    await expect(page.getByLabel('年级', { exact: true })).toHaveValue('一年级');
    await expect(page.getByLabel('学科', { exact: true })).toHaveValue('数学');
    await expect(page.getByLabel('分类', { exact: true })).toHaveValue('学而思');
    await page.getByRole('link', { name: '一棵青菜有多重' }).click();
    await expect(page).toHaveURL(/\/problems\/garden-balance\/1$/);

    await page.getByRole('button', { name: /开始短片/ }).click();
    await playToTheAnswer(page);
    await page.screenshot({ path: info.outputPath('answer-scene.png') });

    // The scene reached is saved: coming back resumes at the question.
    await expect(page.getByRole('complementary', { name: '学习草稿' })).toHaveText(/草稿已保存/);
    await page.reload();
    await page.getByRole('button', { name: /接着上次的地方/ }).click();
    const answer = page.getByRole('region', { name: '说出答案' });
    await expect(answer).toBeVisible();

    // A question with no AI and no microphone sends the child back to the scene.
    const question = page.getByRole('region', { name: '问问小兔' });
    await question.getByRole('button', { name: '有问题？按一下问小兔' }).click();
    await expect(question.getByRole('status')).toHaveText(/我们接着做题吧/);

    // Without a microphone the answer is tapped. A wrong count is explained
    // and the numbers stay; a hint makes the correct count a helped one.
    await answer.getByRole('button', { name: '按一下，说出答案' }).click();
    const numbers = answer.getByRole('group', { name: '点一个数字回答' });
    await numbers.getByRole('button', { name: '6', exact: true }).click();
    await expect(answer.getByRole('status')).toHaveText(/6 是一开始苹果的个数/);
    await answer.getByRole('button', { name: '给我一个提示' }).click();
    await expect(answer.getByText('先看第一架秤：一棵青菜和几个苹果一样重？')).toBeVisible();
    await numbers.getByRole('button', { name: '9', exact: true }).click();
    await expect(answer.getByRole('status')).toHaveText(/答对了！这次用了提示/);
    await answer.screenshot({ path: info.outputPath('answer-assisted.png') });
    await answer.getByRole('button', { name: '接着看' }).click();
    const caption = page.getByRole('region', { name: '菜园天平互动短片' }).getByRole('status');
    await expect(caption).toHaveText(/现在换个条件/);

    // The parent sees the helped answer and the wrong count, apart.
    await signInWithToken(page, baseURL!, parent);
    await page.goto('/family');
    const summary = page.locator('section[aria-labelledby=learning-summary-title]');
    await summary.getByLabel('选择孩子').selectOption({ label: '小鹿' });
    const problem = summary.getByRole('listitem').filter({ hasText: '一棵青菜有多重' });
    await expect(problem.getByText('提示后完成').locator('..')).toHaveText(/1 次/);
    await expect(problem.getByText('确认答错').locator('..')).toHaveText(/1 次/);
    await expect(problem.getByText('独立完成').locator('..')).toHaveText(/0 次/);
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
