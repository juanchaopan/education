import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { gardenFilm, movesToTheAnswer } from './garden-film.js';
import { listenToNarration } from './narration-check.js';
import { signInRecentParent } from './recent-parent.js';
import { checkNow, releaseName, releases, serveReleases } from './release.js';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// An open page and a deployment that moves to another release under it. The
// browser plays both releases: each page load names the release its page was
// built as, and the version file names the release the deployment serves.

const { older, newer } = releases;
const lesson = '/problems/garden-balance/1';
const updateWaits = /更新已准备好，保存后将自动更新/;
const database = process.env.DATABASE_URL;

type Narration = Awaited<ReturnType<typeof listenToNarration>>;

// Opens a page and waits for its first look at the version file.
async function open(page: Page, path: string) {
  const checked = page.waitForResponse('**/version.json');
  await page.goto(path);
  await checked;
}

// Starts the garden film and waits until the teacher is heard speaking.
async function startFilm(page: Page, narration: Narration) {
  await page.getByRole('button', { name: /开始短片|接着上次的地方/ }).click({ timeout: 30_000 });
  await expect.poll(() => narration.told().length).toBeGreaterThan(0);
}

// Opens the garden lesson as a visitor and starts the film; while the teacher
// speaks, the deployment moves to the newer release and the page checks it.
async function newReleaseWhileTheFilmPlays(page: Page) {
  const narration = await listenToNarration(page);
  const site = await serveReleases(page, older);
  await open(page, lesson);
  await startFilm(page, narration);
  site.deploy(newer);
  await checkNow(page, site);
  return { narration, site };
}

// The isolated test database a signed-in test writes to, and Chromium, the
// one browser that sends the test servers' session cookie over http.
function needsIsolatedDatabase() {
  test.skip(
    ({ browserName }) => !database || browserName !== 'chromium',
    'Isolated database required',
  );
  test.beforeEach(() => {
    if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  });
}

test.describe('a page outside a lesson', () => {
  test('takes a new release at once, and only once', async ({ page }) => {
    const site = await serveReleases(page, older);
    await open(page, '/');
    site.deploy(newer);
    await checkNow(page, site);
    await expect.poll(() => site.loads).toBe(2);
    await expect(releaseName(page)).toHaveAttribute('content', newer);
    await checkNow(page, site);
    expect(site.loads).toBe(2);
    await expect(page.getByRole('complementary', { name: '网站更新' })).toHaveCount(0);
  });

  test('stays as it is on the same release, a failed check or an unreadable version file', async ({
    page,
  }) => {
    await page.clock.install();
    const site = await serveReleases(page, older);
    await open(page, '/');
    await page.evaluate(() => Object.assign(window, { kept: true }));
    await checkNow(page, site);
    site.served = 'unreadable';
    await checkNow(page, site);
    // An unreadable reply is tried again a minute later; this one fails.
    site.served = 'fail';
    const failed = page.waitForEvent('requestfailed', (request) =>
      request.url().endsWith('/version.json'),
    );
    await page.clock.fastForward('01:00');
    await failed;
    expect(site.loads).toBe(1);
    expect(await page.evaluate(() => (window as { kept?: boolean }).kept)).toBe(true);
  });

  test('reloads once for a rollback a cache does not serve yet, then offers another try', async ({
    page,
  }) => {
    const site = await serveReleases(page, newer);
    await open(page, '/');
    // The deployment rolls back, but the page that loads is still the newer one.
    site.served = older;
    await checkNow(page, site);
    await expect.poll(() => site.loads).toBe(2);
    const notice = page.getByRole('complementary', { name: '网站更新' });
    await expect(notice).toHaveText(/新版本还没准备好/);
    await checkNow(page, site);
    expect(site.loads).toBe(2);

    // Once the older page is served, another try brings it.
    site.page = older;
    await notice.getByRole('button', { name: '再试一次' }).click();
    await expect.poll(() => site.loads).toBe(3);
    await expect(releaseName(page)).toHaveAttribute('content', older);
    await expect(notice).toHaveCount(0);
  });
});

test.describe('a lesson page', () => {
  test('never cuts off a playing film, and takes the new release once the film is quiet', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { narration, site } = await newReleaseWhileTheFilmPlays(page);
    await expect(gardenFilm(page).film).not.toHaveAttribute('data-shot', 'opening');
    expect(site.loads).toBe(1);

    // The film's first lines end, and it waits for the child: the page reloads,
    // having cut nothing off.
    await expect.poll(() => site.loads, { timeout: 60_000 }).toBe(2);
    expect(narration.told()).toEqual([
      'hello playing',
      'hello ended',
      'clue playing',
      'clue ended',
      'question playing',
      'question ended',
    ]);
    await expect(releaseName(page)).toHaveAttribute('content', newer);
    await expect(page.getByRole('button', { name: /开始短片/ })).toBeVisible({ timeout: 30_000 });
  });

  test('takes the new release at once when the child leaves a playing film', async ({ page }) => {
    test.setTimeout(120_000);
    const { narration, site } = await newReleaseWhileTheFilmPlays(page);
    expect(site.loads).toBe(1);
    expect(narration.told()).not.toContain('question ended');
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await expect.poll(() => site.loads).toBe(2);
    await expect(page).toHaveURL(/\/\?grade=/);
    await expect(releaseName(page)).toHaveAttribute('content', newer);
  });
});

// A signed-in child's draft.
test.describe('a signed-in child', () => {
  needsIsolatedDatabase();

  let pool: pg.Pool;
  let family: string;
  test.beforeEach(async ({ page, baseURL }) => {
    await expect
      .poll(async () => (await page.request.get('/health/ready')).status(), { timeout: 15_000 })
      .toBe(200);
    pool = new pg.Pool({ connectionString: database });
    const seeded = await seedSignedInFamily(pool, ['小鹿']);
    family = seeded.family;
    await signInWithToken(page, baseURL!, seeded.children[0]!.token);
  });
  test.afterEach(async () => {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  });

  // Plays the film to its first question, with the place saved.
  async function reachTheFirstQuestion(page: Page) {
    const narration = await listenToNarration(page);
    const site = await serveReleases(page, older);
    await open(page, lesson);
    await startFilm(page, narration);
    await narration.heard(['hello', 'clue', 'question']);
    const draft = page.getByRole('complementary', { name: '学习草稿' });
    await expect(draft).toHaveText(/草稿已保存/);
    return { narration, site, draft };
  }

  test('keeps a draft that did not save, waits for the save, and stays signed in', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const { narration, site, draft } = await reachTheFirstQuestion(page);
    const saves = '**/api/v1/problems/garden-balance/1/draft';
    await page.route(saves, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, json: { message: '暂时不可用' } })
        : route.fallback(),
    );
    const [takeTheCabbage] = movesToTheAnswer(page);
    await takeTheCabbage!.move();
    await takeTheCabbage!.shown!();
    await expect(draft).toHaveText(/还没同步/);

    // The new release waits for the film, then for the save that fails.
    site.deploy(newer);
    await checkNow(page, site);
    await narration.heard(takeTheCabbage!.says);
    const notice = page.getByRole('complementary', { name: '网站更新' });
    await expect(notice).toHaveText(updateWaits);
    expect(site.loads).toBe(1);

    // Once saves go through, the next check saves the draft and reloads.
    await page.unroute(saves);
    await checkNow(page, site);
    await expect.poll(() => site.loads).toBe(2);
    await expect(releaseName(page)).toHaveAttribute('content', newer);
    await expect(page.getByRole('button', { name: /接着上次的地方/ })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('keeps a draft made offline, and saves it and reloads once back online', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    const { site, draft } = await reachTheFirstQuestion(page);
    await context.setOffline(true);
    const [takeTheCabbage] = movesToTheAnswer(page);
    await takeTheCabbage!.move();
    await takeTheCabbage!.shown!();
    await expect(draft).toHaveText(/还没同步/);
    site.deploy(newer);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(draft).toHaveText(/还没同步/);
    expect(site.loads).toBe(1);

    await context.setOffline(false);
    await expect.poll(() => site.loads, { timeout: 30_000 }).toBe(2);
    await expect(releaseName(page)).toHaveAttribute('content', newer);
    await expect(page.getByRole('button', { name: /接着上次的地方/ })).toBeVisible({
      timeout: 30_000,
    });
  });
});

// A parent's new registration KEY, which is shown only once, on the
// children's page of the parent space.
test.describe('a parent', () => {
  needsIsolatedDatabase();

  test('keeps a new registration KEY on screen until the parent closes it', async ({
    page,
    baseURL,
  }) => {
    const pool = new pg.Pool({ connectionString: database });
    let family: string | undefined;
    try {
      family = (await signInRecentParent(page, baseURL!, pool)).family;
      const site = await serveReleases(page, older);
      await open(page, '/family/children');
      await page.getByRole('button', { name: '生成注册 KEY', exact: true }).click();
      const raw = page.getByLabel('本次生成的注册 KEY');
      await expect(raw).toHaveText(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);

      // A new release waits while the KEY is on screen, check after check.
      site.deploy(newer);
      await checkNow(page, site);
      await checkNow(page, site);
      expect(site.loads).toBe(1);
      await expect(raw).toBeVisible();

      // Closing the KEY lets the page take the new release.
      await page.getByRole('button', { name: '刷新 KEY 状态', exact: true }).click();
      await expect.poll(() => site.loads).toBe(2);
      await expect(releaseName(page)).toHaveAttribute('content', newer);
    } finally {
      if (family) await pool.query('DELETE FROM families WHERE id=$1', [family]);
      await pool.end();
    }
  });
});
