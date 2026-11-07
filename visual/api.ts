import type { Page } from '@playwright/test';
import type { CatalogResponse } from '@education/contracts';

// A fixed answer to one API request, or 'pending' to leave it unanswered so
// the page stays in its loading state.
type Reply = { status: number; json?: unknown } | 'pending';

// API answers keyed by "<method> <path>".
export type Api = Record<string, Reply>;

const signedOut = { status: 401, json: { message: 'unauthorized' } };

// Test fixtures only: these titles and categories never enter the problem list.
const longPath = {
  grade: '一年级下学期拓展',
  subject: '数学思维与生活中的数学',
  category: '图形的位置、方向和拼一拼摆一摆',
};
export const longCatalog: CatalogResponse = {
  problems: [
    {
      ...longPath,
      id: 'visual-fixture-long-title',
      version: 1,
      sequence: 1,
      title:
        '小兔子把十二根胡萝卜平均放进三个篮子里，再从每个篮子里拿出一根送给小松鼠，现在每个篮子里还剩几根？',
    },
    { ...longPath, id: 'visual-fixture-short-title', version: 2, sequence: 2, title: '数一数' },
  ],
};

// What a family that has not signed in sees: the empty catalog, open
// registration and no parent or child session.
export const signedOutApi: Api = {
  'GET /api/v1/problems': { status: 200, json: { problems: [] } satisfies CatalogResponse },
  'GET /api/v1/registration-status': { status: 200, json: { enabled: true } },
  'GET /api/v1/session': signedOut,
  'GET /api/v1/children/session': signedOut,
};

// Answers every API request from the given table. Requests the table does not
// name are refused and returned, so a test can fail on any request it did not
// plan for.
export async function serveApi(page: Page, api: Api) {
  const unexpected: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const key = `${request.method()} ${new URL(request.url()).pathname}`;
    const reply = api[key];
    if (reply === 'pending') return;
    if (!reply) {
      unexpected.push(key);
      return route.abort();
    }
    return route.fulfill({ status: reply.status, json: reply.json ?? {} });
  });
  return unexpected;
}
