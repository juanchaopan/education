import type { Page } from '@playwright/test';

// Signs the browser in with a session token seeded straight into the
// database, as the server's own login would set it.
export function signInWithToken(page: Page, baseURL: string, token: string) {
  return page.context().addCookies([
    {
      name: '__Host-education_session',
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}
