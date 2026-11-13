import { expect, test } from '@playwright/test';
import pg from 'pg';
import { draftSaved } from './draft-save.js';
import { gardenFilm, movesToTheAnswer, play } from './garden-film.js';
import { holdWhile } from './hold.js';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// The first real problem from the production entry point: the catalog places
// it, a signed-in child plays every scene by dragging and tapping, the place
// is saved, and the final count is judged on the server. The browser here has
// no microphone and the server no AI key, so the answer falls back to tapping
// a number and a question sends the child back to the scene. The teacher's
// words are checked without the teacher's name, which only screen readers
// hear before them.

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

    // A question with no AI and no microphone sends the child back to the
    // scene. It is held to ask, until the microphone has answered.
    const { film, caption } = gardenFilm(page);
    await holdWhile(page, film.getByRole('button', { name: '按住问小兔' }), () =>
      expect(caption).toHaveText(/我们接着做题吧/),
    );

    // From the first cabbage to the question of the count, every scene by hand.
    const answerSaved = draftSaved(page, 'answer');
    await play(movesToTheAnswer(page));
    await expect(page.getByRole('region', { name: '说出答案' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: info.outputPath('answer-scene.png') });

    // The scene reached is saved: coming back resumes at the question, and
    // the draft notice says so for a moment.
    await answerSaved;
    await page.reload();
    await page.getByRole('button', { name: /接着上次的地方/ }).click();
    await expect(film.getByRole('complementary', { name: '学习草稿' })).toHaveText(
      /从上次的地方继续/,
    );
    const answer = page.getByRole('region', { name: '说出答案' });

    // Without a microphone the answer is tapped once the question is told.
    // A wrong count is explained and the numbers stay; a hint makes the
    // correct count a helped one.
    const numbers = answer.getByRole('group', { name: '点一个数字回答' });
    await numbers.getByRole('button', { name: '6', exact: true }).click({ timeout: 30_000 });
    await expect(caption).toHaveText(/6 是一开始苹果的个数/);
    await film.getByRole('button', { name: /给我一个提示/ }).click();
    await expect(caption).toHaveText(/先看第一架秤：一棵青菜和几个苹果一样重？$/);
    await numbers.getByRole('button', { name: '9', exact: true }).click();
    await expect(caption).toHaveText(/答对了！这次用了提示/);
    await answer.screenshot({ path: info.outputPath('answer-assisted.png') });
    await answer.getByRole('button', { name: '接着看' }).click();
    await expect(caption).toHaveText(/现在换个条件/);

    // The parent sees the helped answer and the wrong count, apart, in the
    // learning part of the parent space.
    await signInWithToken(page, baseURL!, parent);
    await page.goto('/family/learning');
    const summary = page.locator('section[aria-labelledby=learning-summary-title]');
    await page.getByRole('radio', { name: '小鹿' }).click();
    const problem = summary.getByRole('listitem').filter({ hasText: '一棵青菜有多重' });
    await expect(problem.getByText('提示后完成').locator('..')).toHaveText(/1 次/);
    await expect(problem.getByText('确认答错').locator('..')).toHaveText(/1 次/);
    await expect(problem.getByText('独立完成').locator('..')).toHaveText(/0 次/);
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
