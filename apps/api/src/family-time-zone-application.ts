import type pg from 'pg';
import { withChildSession } from './identity/repositories/postgres-child-session.js';
import {
  readChildFamilyTimeZone,
  readFamilyTimeZone,
} from './identity/repositories/postgres-family-time-zone.js';
import { withParentSession } from './identity/repositories/session-transaction.js';
import {
  createFamilyTimeZoneService,
  type SessionTimeZone,
} from './identity/services/family-time-zone.js';
import { tokenHash, validToken } from './identity/services/session-security.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { RequestError } from './shared/request-error.js';

const signedOut = () => new RequestError(401, '登录状态已失效，请重新登录。');

// Parents and children share the session cookie, so a token is tried as a
// parent's session first and then as a child's.
function sessionTimeZone(pool: pg.Pool): SessionTimeZone {
  return async (token) => {
    if (!validToken(token)) throw signedOut();
    const hash = tokenHash(token);
    try {
      return await withParentSession(pool, hash, (client, parent) =>
        readFamilyTimeZone(client, parent.familyId),
      );
    } catch (error) {
      if (!(error instanceof RequestError) || error.statusCode !== 401) throw error;
    }
    const child = await withChildSession(pool, hash, async (client, { id }) => ({
      zone: await readChildFamilyTimeZone(client, id),
    }));
    if (!child) throw signedOut();
    return child.zone;
  };
}

export function createFamilyTimeZone(pool: pg.Pool, defaultTimeZone: string) {
  return createFamilyTimeZoneService(
    parentSessionTransaction(pool),
    sessionTimeZone(pool),
    defaultTimeZone,
  );
}
