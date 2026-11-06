import { expect, test } from '@playwright/test';
import type { ProblemDetail } from '@education/contracts';

const fixture = {
  id: 'fixture-guide',
  version: 1,
  title: '观察图形',
  grade: '1年级',
  subject: '数学',
  category: '图形',
  sequence: 1,
  teaching: {
    steps: [
      {
        id: 'look',
        instruction: '看看图形的边。',
        retryInstruction: '从最上面的一条边开始。',
        hint: '用手指沿着一条边慢慢移动。',
        example: '书本的上边是一条直边。',
        demonstration: '沿着书本上边走到拐角，再转向下一条边。',
      },
      {
        id: 'turn',
        instruction: '找一找边在哪里转弯。',
        retryInstruction: '先找两条边碰到一起的地方。',
        hint: '看看图形的左上角。',
        demonstration: '沿着左边向上走，在拐角停一下。',
      },
    ],
  },
} satisfies ProblemDetail;

test('uses the versioned teaching page with repeat, retries, hints and confirmation', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/problems/fixture-guide/1', (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto('/problems/fixture-guide/1');
  await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible();
  await expect(page.getByText('找一找边在哪里转弯。')).toHaveCount(0);

  const answer = page.getByRole('textbox', { name: '我的想法' });
  await answer.fill('我看到一条边');
  await page.getByRole('button', { name: '再看指令' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('再看一次。看看图形的边。');
  const retry = page.getByRole('button', { name: '再试一次' });
  await retry.press('Space');
  await retry.press('Space');
  await expect(page.getByRole('status')).toContainText('从最上面的一条边开始。');
  await expect(answer).toHaveValue('我看到一条边');

  await page.getByRole('button', { name: '看个小提示' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('用手指沿着一条边慢慢移动。');
  await page.screenshot({ path: testInfo.outputPath('guided-teaching.png'), fullPage: true });
  await page.getByRole('button', { name: '看个例子' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('书本的上边是一条直边。');
  await page.getByRole('button', { name: '看看示范' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('沿着书本上边走到拐角');

  await page.getByRole('button', { name: '确认我的想法' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('请确认这就是你想表达的内容。');
  await expect(answer).toHaveValue('我看到一条边');
  await page.getByRole('button', { name: '这是我的想法' }).press('Enter');
  await expect(page.getByRole('status')).toContainText('这一步暂时无法判断');
  await page.getByRole('button', { name: '下一步' }).press('Enter');
  await expect(page.getByRole('heading', { name: '找一找边在哪里转弯。' })).toBeFocused();
  await expect(answer).toHaveValue('');
  await expect(page.getByRole('button', { name: '看个小提示' })).toBeVisible();
  await page.getByRole('button', { name: '看完引导' }).press('Enter');
  await expect(page.getByRole('heading', { name: '这次引导看完了' })).toBeFocused();
});
