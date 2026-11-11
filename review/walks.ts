import type { Page } from '@playwright/test';
import { acceptEveryGardenAnswer, signInAtTheGardenStart } from '../e2e/child-at-the-answer.js';
import { answerAndHearTheVariation, hearToTheAnswer } from '../e2e/garden-film.js';
import { listenToNarration } from '../e2e/narration-check.js';

// How each registered lesson is played for its review recording, by its
// problem id. A signed-in child, answered for by the test in place of the
// server, plays from the title card to the last scene, waiting for each line
// of narration to end before the next move, as a child following the film
// would. A walk sets up what the server answers before the page loads, and
// returns how to play the lesson once it has. A lesson added to the registry
// adds its walk here.
export type LessonWalk = (page: Page) => Promise<() => Promise<void>>;

// A moment at the end to see what the last line left on screen.
const linger = (page: Page) => page.waitForTimeout(2_000);

async function gardenBalance(page: Page) {
  await signInAtTheGardenStart(page);
  await acceptEveryGardenAnswer(page);
  const narration = await listenToNarration(page);
  return async () => {
    await hearToTheAnswer(page, narration);
    await answerAndHearTheVariation(page, narration);
    await linger(page);
  };
}

export const walks: Readonly<Record<string, LessonWalk>> = {
  'garden-balance': gardenBalance,
};
