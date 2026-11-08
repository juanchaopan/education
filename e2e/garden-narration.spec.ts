import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { gardenFilm, movesInTheVariation, movesToTheAnswer, play } from './garden-film.js';
import { listenToNarration, recording } from './narration-check.js';
import { seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// Every line of the garden film is heard to its end, in the order of the
// script, by a child who waits for each before moving on: none is skipped,
// none fails and none overlaps another. Runs in desktop Chromium, on a phone
// and in WebKit.

type Narration = Awaited<ReturnType<typeof listenToNarration>>;

const database = process.env.DATABASE_URL;

// The test servers answer over http, and WebKit sends no Secure cookie there,
// so a child can be signed in only in Chromium.
const signsIn = (browserName: string) => !!database && browserName === 'chromium';

async function hearToTheAnswer(page: Page, narration: Narration) {
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
  await narration.heard(['hello', 'clue', 'question']);
  await play(movesToTheAnswer(page), ({ says }) => narration.heard(says));
  await expect(page.locator('[data-narration-failure]')).toHaveCount(0);
}

// Wherever a child cannot be signed in, the film is heard as a guest up to
// the answer; elsewhere the signed-in child below hears these lines and the
// rest of the film.
test('a guest hears every line from the first scene to the question of the count', async ({
  page,
  browserName,
}) => {
  test.skip(signsIn(browserName), 'The signed-in child hears these lines too');
  test.setTimeout(240_000);
  const narration = await listenToNarration(page);
  await page.goto('/problems/garden-balance/1');
  await hearToTheAnswer(page, narration);
});

test('a line that does not come out holds the scene until the child hears it again', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Media requests are routed in Chromium');
  test.setTimeout(180_000);
  await page.clock.install();
  // A recording that does not download keeps the film from starting until
  // the child fetches them again.
  await page.route(recording('hello'), (route) => route.abort());
  await page.goto('/problems/garden-balance/1');
  const retry = page.getByRole('button', { name: '声音没下载好，点这里再试' });
  await expect(retry).toBeVisible({ timeout: 30_000 });
  await page.unrouteAll();
  await retry.click();
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });

  // The line that says the scale is level does not play: the scene waits on
  // it, however long, with its caption and 再听一次.
  await page.route(recording('balanced'), (route) =>
    route.request().resourceType() === 'media' ? route.abort() : route.continue(),
  );
  const moves = movesToTheAnswer(page);
  await play(moves.slice(0, 3));
  await moves[3]!.move();
  const { film, caption } = gardenFilm(page);
  await expect(caption).toHaveText(/平了。现在，一棵青菜和三个苹果一样重。/);
  await expect(film).toHaveAttribute('data-narration-failure', /\w+/, { timeout: 20_000 });
  const again = film.getByRole('button', { name: '再听一次' });
  await expect(again).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(film).toHaveAttribute('data-shot', 'apples');
  await expect(caption).toHaveText(/平了/);

  // Heard again, it plays, and the film moves on to what one apple weighs.
  await page.unrouteAll();
  await again.click();
  await expect(caption).toHaveText(/碰一碰这个苹果/, { timeout: 20_000 });
  await expect(film).not.toHaveAttribute('data-narration-failure');
});

test('a signed-in child hears every line of the film to its end', async ({
  page,
  baseURL,
  browserName,
}) => {
  test.skip(!signsIn(browserName), 'Needs an isolated database and Chromium');
  if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  test.setTimeout(300_000);
  await expect
    .poll(async () => (await page.request.get('/health/ready')).status(), { timeout: 15_000 })
    .toBe(200);
  const pool = new pg.Pool({ connectionString: database });
  const { family, children } = await seedSignedInFamily(pool, ['小鹿']);
  try {
    await signInWithToken(page, baseURL!, children[0]!.token);
    const narration = await listenToNarration(page);
    await page.goto('/problems/garden-balance/1');
    await hearToTheAnswer(page, narration);

    const answer = page.getByRole('region', { name: '说出答案' });
    await answer.getByRole('button', { name: '按一下，说出答案' }).click();
    const numbers = answer.getByRole('group', { name: '点一个数字回答' });
    await numbers.getByRole('button', { name: '9', exact: true }).click();
    await expect(answer.getByRole('status')).toHaveText(/答对了/);
    await answer.getByRole('button', { name: '接着看' }).click();
    await narration.heard(['change']);
    await play(movesInTheVariation(page), ({ says }) => narration.heard(says));
    await expect(page.locator('[data-narration-failure]')).toHaveCount(0);
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
