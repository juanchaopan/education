import type pg from 'pg';
import { readSessionFamilyTimeZone } from './identity/repositories/postgres-family-time-zone.js';
import {
  createFamilyTimeZoneService,
  type SessionTimeZone,
} from './identity/services/family-time-zone.js';
import { tokenHash, validToken } from './identity/services/session-security.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { RequestError } from './shared/request-error.js';

// Parents and children share the session cookie, so one lookup finds the
// family through whichever session the token holds.
function sessionTimeZone(pool: pg.Pool): SessionTimeZone {
  return async (token) => {
    const zone = validToken(token)
      ? await readSessionFamilyTimeZone(pool, tokenHash(token))
      : undefined;
    if (zone === undefined) throw new RequestError(401, '登录状态已失效，请重新登录。');
    return zone;
  };
}

export function createFamilyTimeZone(pool: pg.Pool, defaultTimeZone: string) {
  return createFamilyTimeZoneService(
    parentSessionTransaction(pool),
    sessionTimeZone(pool),
    defaultTimeZone,
  );
}
