import { expect, test } from '@playwright/test';
import { signInAtTheGardenStart } from './child-at-the-answer.js';
import { play } from './film-play.js';
import {
  answerAndHearTheVariation,
  gardenFilm,
  hearToTheAnswer,
  movesToTheAnswer,
} from './garden-film.js';
import { listenToNarration, recording } from './narration-check.js';
import { asSignedInChild, noLineFailed, signsIn } from './narration-runs.js';
import { gardenBookId } from './seeded-family.js';

// Every line of the garden film is heard to its end, in the order of the
// script, by a child who waits for each before moving on: none is skipped,
// none fails and none overlaps another. Runs in desktop Chromium, on a phone
// and in WebKit.

// Wherever a child of the database cannot be signed in, a child the test's
// server answers for hears the film up to the answer; elsewhere the child of
// the database below hears these lines and the rest of the film.
test('a child hears every line from the first scene to the question of the count', async ({
  page,
  browserName,
}) => {
  test.skip(signsIn(browserName), 'The signed-in child hears these lines too');
  test.setTimeout(240_000);
  await signInAtTheGardenStart(page);
  const narration = await listenToNarration(page);
  await page.goto('/problems/garden-balance/1');
  await hearToTheAnswer(page, narration);
  await noLineFailed(page);
});

test('a line that does not come out holds the scene until the child hears it again', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Media requests are routed in Chromium');
  test.setTimeout(180_000);
  await page.clock.install();
  await signInAtTheGardenStart(page);
  // A recording that does not download keeps the film from starting until
  // the child fetches them again.
  const hello = recording('hello');
  await page.route(hello, (route) => route.abort());
  await page.goto('/problems/garden-balance/1');
  const retry = page.getByRole('button', { name: '声音没下载好，点这里再试' });
  await expect(retry).toBeVisible({ timeout: 30_000 });
  await page.unroute(hello);
  await retry.click();
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });

  // The line that says the scale is level does not play: the scene waits on
  // it, however long, with its caption and the honey replay drop.
  const balanced = recording('balanced');
  await page.route(balanced, (route) =>
    route.request().resourceType() === 'media' ? route.abort() : route.continue(),
  );
  const moves = movesToTheAnswer(page);
  await play(moves.slice(0, 3));
  await moves[3]!.move();
  const { film, caption } = gardenFilm(page);
  await expect(caption).toHaveText(/平了！一棵青菜和三个苹果一样重。/);
  await expect(film).toHaveAttribute('data-narration-failure', /\w+/, { timeout: 20_000 });
  const again = film.getByRole('button', { name: '再听一次' });
  await expect(again).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(film).toHaveAttribute('data-shot', 'apples');
  await expect(caption).toHaveText(/平了/);

  // Heard again, it plays, and the film moves on to what one apple weighs.
  await page.unroute(balanced);
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
  test.setTimeout(300_000);
  const lesson = { path: '/problems/garden-balance/1', book: gardenBookId };
  await asSignedInChild(page, baseURL!, lesson, async (narration) => {
    await hearToTheAnswer(page, narration);
    await noLineFailed(page);
    await answerAndHearTheVariation(page, narration);
    await noLineFailed(page);
  });
});
