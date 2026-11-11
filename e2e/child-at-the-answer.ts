import { randomUUID } from 'node:crypto';
import type { DraftCommand } from '@education/contracts';
import type { Page } from '@playwright/test';

// The garden lesson's part of the API, and the answer round the test's server
// keeps open in it.
export const gardenApi = '/api/v1/problems/garden-balance/1';
export const round = '11111111-1111-1111-1111-111111111111';

const expiresAt = '2099-01-01T00:00:00.000Z';

// A signed-in child, as the server would answer for one. The test answers for
// the server, so no database is needed.
async function signInAsAChild(page: Page) {
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ json: { role: 'child', nickname: '小鹿', csrfToken: 'a'.repeat(43) } }),
  );
}

// A signed-in child whose saved place in the garden lesson is the answer scene.
export async function signInAtTheGardenAnswer(page: Page) {
  const savedAnswer = {
    revision: '33333333-3333-3333-3333-333333333333',
    expiresAt,
    content: { stepId: 'answer', drawing: [] },
  };
  await signInAsAChild(page);
  await page.route(`**${gardenApi}/draft`, (route) =>
    route.fulfill({ json: { draft: savedAnswer } }),
  );
}

// A signed-in child who has not started the garden lesson: the draft the
// lesson saves at each scene is kept, as the server would keep it.
export async function signInAtTheGardenStart(page: Page) {
  await signInAsAChild(page);
  await page.route(`**${gardenApi}/draft`, (route) => {
    const write = route.request().postDataJSON() as DraftCommand | null;
    const draft =
      write?.action === 'save'
        ? { revision: randomUUID(), expiresAt, content: write.content }
        : null;
    return route.fulfill({ json: { draft } });
  });
}

// How the test's server judges the garden answer: the outcome it gives every
// count, and the words of each hint the child asks for, when it gives any.
type GardenAnswers = Readonly<{ outcome?: 'independent' | 'assisted'; hint?: string }>;

// A server that opens the answer round and takes each count the child
// submits as correct, without help unless told otherwise. It gives hints
// only when told their words, and never answers a question to the teacher.
export async function acceptEveryGardenAnswer(
  page: Page,
  { outcome = 'independent', hint }: GardenAnswers = {},
) {
  await page.route(`**${gardenApi}/answer`, (route) => {
    const body = route.request().postDataJSON() as { action?: string; attemptId?: string } | null;
    if (!body) return route.fulfill({ json: { round } });
    if (body.action === 'hint' && hint) return route.fulfill({ json: { hint } });
    return route.fulfill({ json: { attemptId: body.attemptId, outcome } });
  });
}
