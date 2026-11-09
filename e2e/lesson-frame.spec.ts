import { expect, test, type Page } from '@playwright/test';
import { gardenApi, round, signInAtTheGardenAnswer } from './child-at-the-answer.js';
import { gardenFilm } from './garden-film.js';

// A problem's page fills the screen with no site header, goes full screen as
// the film starts where the browser allows it, and its back button returns
// the child where they came from.

const lesson = '/problems/garden-balance/1';
const category = '/?grade=一年级&subject=数学&category=学而思';

// Where the page is, as the child would read it.
const address = (page: Page) => {
  const url = new URL(page.url());
  return decodeURIComponent(`${url.pathname}${url.search}`);
};
const inFullscreen = (page: Page) => page.evaluate(() => document.fullscreenElement !== null);
const scrolled = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const back = (page: Page) => page.getByRole('button', { name: '返回', exact: true });
const gardenLink = (page: Page) => page.getByRole('link', { name: '一棵青菜有多重' });

// Picks the garden problem's category in the catalog, level by level.
async function chooseTheGardenCategory(page: Page) {
  await page.goto('/');
  await page.getByLabel('年级', { exact: true }).selectOption('一年级');
  await page.getByLabel('学科', { exact: true }).selectOption('数学');
  await page.getByLabel('分类', { exact: true }).selectOption('学而思');
  await expect.poll(() => address(page)).toBe(category);
}

// Opens the garden problem from the catalog and starts its film, or takes it
// up where it was left.
async function openTheGarden(page: Page) {
  await gardenLink(page).click();
  await expect(page).toHaveURL(/\/problems\/garden-balance\/1$/);
  await page.getByRole('button', { name: /开始短片|接着上次的地方/ }).click({ timeout: 30_000 });
}

test('goes back to the same category of the catalog, scrolled as it was, out of full screen', async ({
  page,
}) => {
  await chooseTheGardenCategory(page);
  // The catalog is scrolled to its foot, and how far down it was is read at
  // the moment of the tap, since bringing the link into view may scroll it.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.addEventListener(
      'click',
      () => Object.assign(window, { scrolledAtTap: Math.round(window.scrollY) }),
      { capture: true, once: true },
    );
  });
  await openTheGarden(page);
  const position = await page.evaluate(() => (window as { scrolledAtTap?: number }).scrolledAtTap);
  expect(position).toBeGreaterThan(0);
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
  await expect.poll(() => inFullscreen(page)).toBe(true);

  await back(page).click();
  await expect.poll(() => address(page)).toBe(category);
  await expect(gardenLink(page)).toBeVisible();
  await expect.poll(() => scrolled(page)).toBe(position);
  expect(await inFullscreen(page)).toBe(false);
});

test("goes back from a link opened directly to the problem's own category", async ({ page }) => {
  await page.goto(lesson);
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
  await back(page).click();
  await expect.poll(() => address(page)).toBe(category);
  await expect(page.getByLabel('分类', { exact: true })).toHaveValue('学而思');
  await expect(gardenLink(page)).toBeVisible();
});

test("the browser's own back button still leaves the problem, and full screen", async ({
  page,
}) => {
  await chooseTheGardenCategory(page);
  await openTheGarden(page);
  await page.goBack();
  await expect.poll(() => address(page)).toBe(category);
  await expect.poll(() => inFullscreen(page)).toBe(false);
});

// A browser that refuses the whole screen, and one, like Safari on an iPhone,
// that has no way to ask for it.
const refusals = {
  refuses: () => {
    Element.prototype.requestFullscreen = () =>
      Promise.reject(new TypeError('Permissions check failed'));
  },
  'cannot ask for': () => {
    delete (Element.prototype as Partial<Element>).requestFullscreen;
  },
};

for (const [name, browser] of Object.entries(refusals))
  test(`starts the film as usual when the browser ${name} the whole screen`, async ({ page }) => {
    await page.addInitScript(browser);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(lesson);
    await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
    const { film, caption } = gardenFilm(page);
    await expect(film).not.toHaveAttribute('data-shot', 'opening');
    await expect(caption).toHaveText(/\S/);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await inFullscreen(page)).toBe(false);
    expect(errors).toEqual([]);
  });

// Phones upright and sideways, a tablet and a computer.
const screens = {
  'a phone held upright': { width: 390, height: 844 },
  'a phone held sideways': { width: 844, height: 390 },
  'a tablet': { width: 820, height: 1180 },
  'a computer': { width: 1440, height: 900 },
};

for (const [name, size] of Object.entries(screens))
  test(`fills ${name} with the film and keeps the back button in reach`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'every screen is set here');
    await page.setViewportSize(size);
    await page.goto(lesson);
    const { film } = gardenFilm(page);
    await expect(page.getByRole('button', { name: /开始短片/ })).toBeVisible({ timeout: 30_000 });
    const stage = (await film.boundingBox())!;
    const notice = (await page.getByRole('link', { name: '去孩子空间登录' }).boundingBox())!;
    expect(stage.y).toBe(0);
    expect(stage.x).toBe(0);
    if (size.height <= 500) {
      // Sideways the panels take a column to the right of the film.
      expect(stage.height).toBe(size.height);
      expect(notice.x).toBeGreaterThanOrEqual(stage.width);
    } else {
      expect(stage.width).toBe(size.width);
      expect(notice.y).toBeGreaterThanOrEqual(stage.height);
      expect(stage.height).toBeGreaterThanOrEqual(size.height * 0.6);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
    await expect(back(page)).toBeInViewport();
    await page.keyboard.press('Tab');
    await expect(back(page)).toBeFocused();
  });

// A server that holds each answer on its way until the test lets it through.
// Returns the answers sent and the way to let them through.
async function holdTheAnswers(page: Page) {
  const sent: unknown[] = [];
  let judge!: () => void;
  const judged = new Promise<void>((resolve) => (judge = resolve));
  await page.route(`**${gardenApi}/answer`, async (route) => {
    const body = route.request().postDataJSON() as { action?: string; attemptId?: string } | null;
    if (!body) return route.fulfill({ json: { round } });
    sent.push(body);
    await judged;
    return route.fulfill({ json: { attemptId: body.attemptId, outcome: 'independent' } });
  });
  return { sent, judge };
}

test('waits for an answer being judged before leaving, and sends it once', async ({ page }) => {
  test.setTimeout(90_000);
  await signInAtTheGardenAnswer(page);
  const answers = await holdTheAnswers(page);
  await chooseTheGardenCategory(page);
  await openTheGarden(page);

  // Without a microphone the count is tapped once the question has been told.
  const answer = page.getByRole('region', { name: '说出答案' });
  await answer
    .getByRole('group', { name: '点一个数字回答' })
    .getByRole('button', { name: '9', exact: true })
    .click({ timeout: 30_000 });
  await expect.poll(() => answers.sent.length).toBe(1);
  await back(page).click();
  await expect(page.getByRole('button', { name: '正在保存，好了就返回' })).toBeVisible();
  expect(address(page)).toBe(lesson);

  answers.judge();
  await expect.poll(() => address(page)).toBe(category);
  expect(answers.sent).toHaveLength(1);
});
