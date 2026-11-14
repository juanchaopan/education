import type { Page } from '@playwright/test';
import { acceptEveryAnswer, gardenApi, signInAtTheStart } from '../e2e/child-at-the-answer.js';
import { answerAndHearTheVariation, hearToTheAnswer } from '../e2e/garden-film.js';
import { listenToNarration } from '../e2e/narration-check.js';
import * as rail from '../e2e/rail-film.js';

// How each registered lesson is played for its review recording, by its
// problem id. A problem opens only for someone signed in, so each walk signs
// in as a child given the lesson's book (signInAsAssignedChild from
// e2e/assigned-child.ts, with the lesson's problem and book), answered for by
// the test in place of the server, and plays from the title card to the last
// scene, waiting for each line of narration to end before the next move, as
// a child following the film would. A walk sets up what the server answers
// before the page loads, and returns how to play the lesson once it has. A
// lesson added to the registry adds its walk here.
export type LessonWalk = (page: Page) => Promise<() => Promise<void>>;

// A moment at the end to see what the last line left on screen.
const linger = (page: Page) => page.waitForTimeout(2_000);

async function gardenBalance(page: Page) {
  await signInAtTheStart(page, gardenApi);
  await acceptEveryAnswer(page, gardenApi);
  const narration = await listenToNarration(page);
  return async () => {
    await hearToTheAnswer(page, narration);
    await answerAndHearTheVariation(page, narration);
    await linger(page);
  };
}

async function railChase(page: Page) {
  await signInAtTheStart(page, rail.railApi, rail.railChild);
  await acceptEveryAnswer(page, rail.railApi);
  const narration = await listenToNarration(page);
  return async () => {
    await rail.hearToTheAnswer(page, narration);
    await rail.answerAndHearTheRest(page, narration);
    await linger(page);
  };
}

export const walks: Readonly<Record<string, LessonWalk>> = {
  'garden-balance': gardenBalance,
  'rail-chase': railChase,
};
