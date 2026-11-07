import { expect, type Page } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { csrfToken, tokenHash } from '../apps/api/src/identity/services/session-security.js';

// Seeds a verified parent with one child and a session whose password was
// confirmed just now, signs the browser in with it, and answers the browser's
// password check with that same session. The password check has its own
// browser tests; answering it here keeps a test out of the sign-in budget that
// every browser test shares from one address, while the request it guards
// stays real. The caller deletes the returned family when done.
export async function signInRecentParent(page: Page, baseURL: string, pool: pg.Pool) {
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const email = `${family}@example.test`;
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'private-password-hash',true) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified,password_verified_at)
     SELECT $3,id,1,1,now()+interval '1 hour',true,clock_timestamp() FROM parent`,
    [family, email, tokenHash(token)],
  );
  await pool.query(
    `INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,'小鹿','小鹿','private-pin-hash',1)`,
    [family],
  );
  await expect.poll(() => page.request.get('/health/ready').then((r) => r.status())).toBe(200);
  await page.context().addCookies([
    {
      name: '__Host-education_session',
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.route('**/api/v1/parents/reauthenticate', (route) =>
    route.fulfill({
      json: {
        role: 'parent',
        email,
        emailVerified: true,
        access: 'verified',
        csrfToken: csrfToken(token),
      },
    }),
  );
  return { family, email };
}
