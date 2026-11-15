import { randomUUID } from 'node:crypto';
import type { DraftCommand } from '@education/contracts';
import type { Page } from '@playwright/test';
import { signInAsAssignedChild, type Given } from './assigned-child.js';

// A lesson's part of the API, by its problem version.
export const lessonApi = (id: string, version = 1) => `/api/v1/problems/${id}/${version}`;

// The garden lesson's part of the API, and the answer round the test's server
// keeps open in every lesson.
export const gardenApi = lessonApi('garden-balance');
export const round = '11111111-1111-1111-1111-111111111111';

const expiresAt = '2099-01-01T00:00:00.000Z';

// A signed-in child whose saved place in the garden lesson is the answer scene.
export async function signInAtTheGardenAnswer(page: Page) {
  const savedAnswer = {
    revision: '33333333-3333-3333-3333-333333333333',
    expiresAt,
    content: { stepId: 'answer', drawing: [] },
  };
  await signInAsAssignedChild(page);
  await page.route(`**${gardenApi}/draft`, (route) =>
    route.fulfill({ json: { draft: savedAnswer } }),
  );
}

// A signed-in child, given the books of `given`, who has not started the
// lesson behind `api`: the draft the lesson saves at each scene is kept, as
// the server would keep it.
export async function signInAtTheStart(page: Page, api: string, given?: Given) {
  await signInAsAssignedChild(page, given);
  await page.route(`**${api}/draft`, (route) => {
    const write = route.request().postDataJSON() as DraftCommand | null;
    const draft =
      write?.action === 'save'
        ? { revision: randomUUID(), expiresAt, content: write.content }
        : null;
    return route.fulfill({ json: { draft } });
  });
}

// A signed-in child who has not started the garden lesson.
export const signInAtTheGardenStart = (page: Page) => signInAtTheStart(page, gardenApi);

// How the test's server judges a lesson's answer: the outcome it gives
// every answer, and the words of each hint the child asks for, when it
// gives any.
type Answers = Readonly<{ outcome?: 'independent' | 'assisted'; hint?: string }>;

type Command = { action?: string; attemptId?: string } | null;

// A server that opens the answer round of the lesson behind `api` and takes
// each answer the child submits as correct, without help unless told
// otherwise, and then the variation of that round: its guess recorded and
// its reason clear, with the same outcome. It gives hints only when told
// their words, and never answers a question to the teacher.
export async function acceptEveryAnswer(
  page: Page,
  api: string,
  { outcome = 'independent', hint }: Answers = {},
) {
  const judged = (body: NonNullable<Command>) => {
    if (body.action === 'hint' && hint) return { hint };
    return { attemptId: body.attemptId, outcome };
  };
  await page.route(`**${api}/answer`, (route) => {
    const body = route.request().postDataJSON() as Command;
    return route.fulfill({ json: body ? judged(body) : { round } });
  });
  await page.route(`**${api}/variation`, (route) => {
    const body = route.request().postDataJSON() as Command;
    return route.fulfill({
      json: body ? judged(body) : { round, guessed: false, explained: false },
    });
  });
}
