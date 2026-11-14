import { expect, test, type Page } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import type { ChildBook } from '@education/contracts';
import { bookPage, child, garden, gardenBook, signInAsAssignedChild } from './assigned-child.js';
import { signInAtTheGardenStart } from './child-at-the-answer.js';
import { sourceName } from './built-file.js';

// What a page asks of the problems: the problem API it calls and the lesson
// pictures and scripts it downloads.
function problemTraffic(page: Page) {
  const api: string[] = [];
  const files: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/v1/problems')) api.push(url.pathname);
    if (/\.(webp|js)$/.test(url.pathname)) files.push(sourceName(request.url()));
  });
  return { api, files };
}

test('a visitor finds only the sign-in at home, and nothing of any problem', async ({ page }) => {
  const traffic = problemTraffic(page);
  await page.goto('/');
  await expect(page.getByRole('tab', { name: '孩子登录' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '家长登录' })).toBeVisible();
  expect(traffic.api).toEqual([]);
  expect(traffic.files).not.toContain('garden-morning');
});

test('a visitor opening a problem link sees only the way to sign in, and comes back to it after', async ({
  page,
}) => {
  const traffic = problemTraffic(page);
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto(`/problems/${garden.id}/${garden.version}`);
  await expect(page.getByRole('heading', { name: '登录后才能打开这道题' })).toBeVisible();
  await expect(page.getByText(garden.title)).toHaveCount(0);
  expect(traffic.api).toEqual([]);
  expect(traffic.files.filter((file) => /garden|LessonPage/.test(file))).toEqual([]);

  await page.getByRole('link', { name: '去登录' }).click();
  await expect(page).toHaveURL(/\/\?next=%2Fproblems%2Fgarden-balance%2F1$/);
  await signInAtTheGardenStart(page);
  await page.route('**/api/v1/children/login', (route) => route.fulfill({ json: child }));
  await page.getByLabel('我的家庭码', { exact: true }).fill('ABCD-EFGH-JKMN');
  await page.getByLabel('我的昵称', { exact: true }).fill(child.nickname);
  await page.getByLabel('我的六位 PIN').fill('018274');
  await page.getByRole('button', { name: '进入我的空间' }).click();
  await expect(page).toHaveURL(/\/problems\/garden-balance\/1$/);
  await expect(page.getByRole('button', { name: /开始短片/ })).toBeVisible({ timeout: 30_000 });
});

test('a new book stays new until the child opens one of its problems, not just the book', async ({
  page,
}) => {
  let opened = false;
  await signInAtTheGardenStart(page);
  await page.route('**/api/v1/children/assignments?*', (route) =>
    route.fulfill({ json: bookPage([{ ...gardenBook, fresh: !opened }]) }),
  );
  await page.route(`**/api/v1/problems/${garden.id}/${garden.version}`, (route) => {
    opened = true;
    return route.fulfill({ json: garden });
  });
  await page.goto('/');
  const newBooks = page.getByLabel('1 本新书');
  await expect(newBooks).toBeVisible();
  await page.getByRole('button', { name: /^学而思，新书/ }).click();
  await page.reload();
  await expect(newBooks).toBeVisible();

  await page.getByRole('link', { name: garden.title }).click();
  await expect(page.getByRole('button', { name: /开始短片/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('button', { name: '收起学而思' })).toBeVisible();
  await expect(page.getByText('0 / 1', { exact: true })).toBeVisible();
  await expect(newBooks).toHaveCount(0);
});

// Eight books, served six at a time.
const many: ChildBook[] = Array.from({ length: 8 }, (_, place) => ({
  ...gardenBook,
  id: `fixture-book-${place}`,
  name: `夹具书 ${place + 1}`,
  fresh: false,
  studiedAt: '2026-11-11T08:00:00.000Z',
}));

test('more books come with 加载更多 on a computer, and by themselves on a touch screen', async ({
  page,
  isMobile,
}) => {
  await signInAsAssignedChild(page);
  await page.route('**/api/v1/children/assignments?*', (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset'));
    const all = bookPage(many);
    return route.fulfill({
      json: { ...all, books: many.slice(offset, offset + 6), hasMore: offset + 6 < many.length },
    });
  });
  await page.goto('/');
  const books = page.getByRole('article');
  await expect(books).toHaveCount(6);
  if (isMobile) {
    await expect(page.getByRole('button', { name: '加载更多' })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  } else await page.getByRole('button', { name: '加载更多' }).click();
  await expect(books).toHaveCount(8);
  await expect(page.getByText('都在这里了')).toBeVisible();
});

test('the production browser bundle excludes fixture content and server checking rules', async () => {
  const assets = new URL('../apps/web/dist/assets/', import.meta.url);
  const scripts = (await readdir(assets)).filter((file) => file.endsWith('.js'));
  expect(scripts.length).toBeGreaterThan(0);
  for (const file of scripts) {
    const code = await readFile(new URL(file, assets), 'utf8');
    expect(code).not.toMatch(/fixture-circle|fixture-review|private-answer-rule-sentinel/);
  }
});
