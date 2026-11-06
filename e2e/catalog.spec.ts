import { expect, test } from '@playwright/test';
import type { CatalogResponse } from '@education/contracts';
import { readdir, readFile } from 'node:fs/promises';

const shapes = { grade: '1年级', subject: '数学', category: '图形' };
const reading = { grade: '1年级', subject: '语文', category: '阅读' };
const empty = { grade: '2年级', subject: '科学', category: '观察' };
const catalog = {
  categories: [shapes, reading, empty],
  problems: [
    { ...shapes, id: 'fixture-circle', title: '夹具：找圆形', version: 2, sequence: 1 },
    { ...shapes, id: 'fixture-square', title: '夹具：找正方形', version: 1, sequence: 1 },
    { ...reading, id: 'fixture-story', title: '夹具：读故事', version: 1, sequence: 1 },
  ],
} satisfies CatalogResponse;

test('browses four levels, opens versioned links freely and handles empty categories', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/problems', (route) => route.fulfill({ json: catalog }));
  await page.goto('/');
  await expect(page.getByRole('list', { name: '题目顺序' }).getByRole('link')).toHaveText([
    '夹具：找圆形',
    '夹具：找正方形',
  ]);
  await expect(page.getByRole('link', { name: '夹具：找圆形' })).toHaveAttribute(
    'href',
    '/problems/fixture-circle/2',
  );
  await page.locator('section[aria-labelledby=library-title]').screenshot({
    path: testInfo.outputPath('catalog-navigation.png'),
  });
  await page.getByLabel('学科', { exact: true }).selectOption('语文');
  await expect(page.getByLabel('分类', { exact: true })).toHaveValue('阅读');
  await page.getByRole('link', { name: '夹具：读故事' }).click();
  await expect(page).toHaveURL(/\/problems\/fixture-story\/1$/);
  await expect(page.getByRole('heading', { name: '这道题暂时不可用' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('学科', { exact: true })).toHaveValue('语文');
  await page.getByLabel('年级', { exact: true }).selectOption('2年级');
  await expect(page.getByLabel('学科', { exact: true })).toHaveValue('科学');
  await expect(page.getByRole('heading', { name: '这个分类还没有题目' })).toBeVisible();
});

test('the production browser bundle excludes fixture content and server checking rules', async () => {
  const assets = new URL('../apps/web/dist/assets/', import.meta.url);
  const scripts = (await readdir(assets)).filter((file) => file.endsWith('.js'));
  expect(scripts.length).toBeGreaterThan(0);
  for (const file of scripts) {
    const code = await readFile(new URL(file, assets), 'utf8');
    expect(code).not.toMatch(
      /fixture-circle|fixture-review|fixture-guide|private-answer-rule-sentinel/,
    );
  }
});
