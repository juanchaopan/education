import { test } from '@playwright/test';
import { signInAtTheStart } from './child-at-the-answer.js';
import { listenToNarration } from './narration-check.js';
import { asSignedInChild, noLineFailed, signsIn } from './narration-runs.js';
import {
  answerAndHearTheRest,
  hearToTheAnswer,
  railApi,
  railChase,
  railChild,
} from './rail-film.js';

// Every line of the rail chase film is heard to its end, in the order of
// the script, by a child who waits for each before moving on: none is
// skipped, none fails and none overlaps another. Runs in desktop Chromium,
// on a phone and in WebKit.

// Wherever a child of the database cannot be signed in, a child the test's
// server answers for hears the film up to the question of both times;
// elsewhere the child of the database below hears these lines and the rest
// of the film. The film is long and WebKit plays it
// slowest, so each test waits up to a quarter of an hour or more.
test('a child hears every line from the first scene to the question of both times', async ({
  page,
  browserName,
}) => {
  test.skip(signsIn(browserName), 'The signed-in child hears these lines too');
  test.setTimeout(900_000);
  await signInAtTheStart(page, railApi, railChild);
  const narration = await listenToNarration(page);
  await page.goto('/problems/rail-chase/1');
  await hearToTheAnswer(page, narration);
  await noLineFailed(page);
});

test('a signed-in child hears every line of the film to its end', async ({
  page,
  baseURL,
  browserName,
}) => {
  test.skip(!signsIn(browserName), 'Needs an isolated database and Chromium');
  test.setTimeout(1_200_000);
  const lesson = { path: '/problems/rail-chase/1', book: railChase.book };
  await asSignedInChild(page, baseURL!, lesson, async (narration) => {
    await hearToTheAnswer(page, narration);
    await noLineFailed(page);
    await answerAndHearTheRest(page, narration);
    await noLineFailed(page);
  });
});
