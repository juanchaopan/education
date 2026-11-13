import type { Page } from '@playwright/test';
import type { ParentSession, VerificationStatus } from '@education/contracts';

// A fixed answer to one API request, or 'pending' to leave it unanswered so
// the page stays in its loading state.
type Reply = { status: number; json?: unknown } | 'pending';

// API answers keyed by "<method> <path>", or by "<method> <path>?<query>"
// for an answer to one query alone.
export type Api = Record<string, Reply>;

const signedOut = { status: 401, json: { message: 'unauthorized' } };

// What a family that has not signed in sees: open registration and no parent
// or child session, so no family time zone either.
export const signedOutApi: Api = {
  'GET /api/v1/registration-status': { status: 200, json: { enabled: true } },
  'GET /api/v1/session': signedOut,
  'GET /api/v1/children/session': signedOut,
  'GET /api/v1/family/time-zone': signedOut,
};

// A parent signed in with a long synthetic address that is not verified yet,
// whose verification mail the mail service has accepted a moment ago.
export const unverifiedParentApi: Api = {
  'GET /api/v1/session': {
    status: 200,
    json: {
      role: 'parent',
      email: 'a-long-synthetic-family-email-address@example.test',
      emailVerified: false,
      access: 'verification-only',
      csrfToken: 'a'.repeat(43),
    } satisfies ParentSession,
  },
  'GET /api/v1/parents/verification': {
    status: 200,
    json: {
      enabled: true,
      status: 'accepted',
      retryAfter: 40,
      canRetry: false,
    } satisfies VerificationStatus,
  },
};

// Answers every API request from the given table, by its query when the
// table names it and otherwise by its path. Requests the table does not name
// are refused and returned, so a test can fail on any request it did not
// plan for.
export async function serveApi(page: Page, api: Api) {
  const unexpected: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const { pathname, search } = new URL(request.url());
    const key = `${request.method()} ${pathname}`;
    const reply = api[`${key}${search}`] ?? api[key];
    if (reply === 'pending') return;
    if (!reply) {
      unexpected.push(key);
      return route.abort();
    }
    return route.fulfill({ status: reply.status, json: reply.json ?? {} });
  });
  return unexpected;
}
