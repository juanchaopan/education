import type { Page } from '@playwright/test';

// The garden lesson's part of the API, and the answer round the test's server
// keeps open in it.
export const gardenApi = '/api/v1/problems/garden-balance/1';
export const round = '11111111-1111-1111-1111-111111111111';

// A signed-in child, as the server would answer for one, whose saved place in
// the garden lesson is the answer scene. The test answers for the server, so
// no database is needed.
export async function signInAtTheGardenAnswer(page: Page) {
  const savedAnswer = {
    revision: '33333333-3333-3333-3333-333333333333',
    expiresAt: '2099-01-01T00:00:00.000Z',
    content: { stepId: 'answer', drawing: [] },
  };
  await page.route('**/api/v1/children/session', (route) =>
    route.fulfill({ json: { role: 'child', nickname: '小鹿', csrfToken: 'a'.repeat(43) } }),
  );
  await page.route(`**${gardenApi}/draft`, (route) =>
    route.fulfill({ json: { draft: savedAnswer } }),
  );
}
