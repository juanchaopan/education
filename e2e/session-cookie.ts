import type { Page } from '@playwright/test';
import { sessionCookie } from '../apps/api/src/shared/session-cookie.js';

// Signs the browser in with a session token seeded straight into the
// database, as the server's own login would set it.
export function signInWithToken(page: Page, baseURL: string, token: string) {
  return page.context().addCookies([
    {
      name: sessionCookie,
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}
