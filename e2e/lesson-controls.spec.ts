import { expect, test, type Locator, type Page } from '@playwright/test';
import { gardenApi, round, signInAtTheGardenAnswer } from './child-at-the-answer.js';
import { gardenFilm } from './garden-film.js';

// The controls laid into the garden film's picture: the captions and sound
// the child chooses are kept on the device, and on an upright screen no
// control covers the scene's props.

const lesson = '/problems/garden-balance/1';

type Box = { x: number; y: number; width: number; height: number };

async function boxesOf(found: Locator) {
  const boxes: Box[] = [];
  for (const one of await found.all()) {
    const box = await one.boundingBox();
    if (box && box.width > 0 && box.height > 0) boxes.push(box);
  }
  return boxes;
}

const overlap = (one: Box, other: Box) =>
  one.x < other.x + other.width &&
  other.x < one.x + one.width &&
  one.y < other.y + other.height &&
  other.y < one.y + one.height;

// Every control in the picture against everything the scene draws, which
// on an upright screen is the props alone, the teacher being in its
// portrait there; none lies over another.
async function expectControlsClearOfProps(film: Locator) {
  const [scene] = await boxesOf(film.locator('svg g[class*="scene"]'));
  const controls = await boxesOf(film.locator('[data-at] > *'));
  expect(scene).toBeDefined();
  expect(controls.length).toBeGreaterThan(0);
  expect(controls.filter((control) => overlap(control, scene!))).toEqual([]);
}

// Every recording downloads before the film can start, which can take a while
// with the other tests running beside this one.
test.beforeEach(() => test.setTimeout(90_000));

async function startAsAGuest(page: Page) {
  await page.goto(lesson);
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 60_000 });
  return gardenFilm(page);
}

test('keeps the captions the child turned off for every later visit', async ({ page }) => {
  const { film, caption } = await startAsAGuest(page);
  await expect(caption).toHaveText(/\S/);
  await film.getByRole('button', { name: '字幕', pressed: true }).click();
  await expect(caption).toBeEmpty();
  await page.reload();
  await startAsAGuest(page);
  await expect(film.getByRole('button', { name: '字幕', pressed: false })).toBeVisible();
  await expect(caption).toBeEmpty();
});

test('shows the captions, and keeps them on, while the sound is off', async ({ page }) => {
  const { film, caption } = await startAsAGuest(page);
  await film.getByRole('button', { name: '字幕', pressed: true }).click();
  await film.getByRole('button', { name: '声音', pressed: true }).click();
  await expect(caption).toHaveText(/\S/);
  await expect(film.getByRole('button', { name: '字幕', pressed: true })).toBeDisabled();
  await page.reload();
  await startAsAGuest(page);
  await expect(film.getByRole('button', { name: '声音', pressed: false })).toBeVisible();
  await expect(caption).toHaveText(/\S/);
});

const upright = {
  'a phone held upright': { width: 390, height: 844 },
  'a small phone with the browser bars showing': { width: 390, height: 664 },
  'a tablet held upright': { width: 820, height: 1180 },
};

for (const [name, size] of Object.entries(upright)) {
  test(`keeps a visitor's controls clear of the props on ${name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'every screen is set here');
    await page.setViewportSize(size);
    const { film } = await startAsAGuest(page);
    await expect(film.getByRole('button', { name: '青菜' }).first()).toBeVisible();
    await expectControlsClearOfProps(film);
  });

  test(`keeps the answer, the hint and the microphone clear of the props on ${name}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'every screen is set here');
    await page.setViewportSize(size);
    await signInAtTheGardenAnswer(page);
    await page.route(`**${gardenApi}/answer`, (route) => route.fulfill({ json: { round } }));
    await page.goto(lesson);
    await page.getByRole('button', { name: /接着上次的地方/ }).click({ timeout: 60_000 });
    const { film } = gardenFilm(page);
    // Without a microphone the numbers to tap join the answer once the
    // question has been told, and the answer is at its largest.
    await expect(film.getByRole('group', { name: '点一个数字回答' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(film.getByRole('button', { name: /给我一个提示/ })).toBeVisible();
    await expectControlsClearOfProps(film);
  });
}
