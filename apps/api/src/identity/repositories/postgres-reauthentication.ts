import type pg from 'pg';
import { createSessionRepository } from './postgres-session.js';
import { withParentSession } from './session-transaction.js';
import type { ReauthenticationRepository } from './reauthentication.js';

export function createReauthenticationRepository(pool: pg.Pool): ReauthenticationRepository {
  return {
    find: createSessionRepository(pool).find,
    confirm: (expected, previous, next) =>
      withParentSession(pool, previous, async (client, current) => {
        if (
          current.id !== expected.id ||
          current.passwordHash !== expected.passwordHash ||
          current.credentialVersion !== expected.credentialVersion ||
          current.familyEpoch !== expected.familyEpoch
        )
          return undefined;
        const result = await client.query<{ seconds: number }>(
          `
        UPDATE parent_sessions SET token_hash=$2, password_verified_at=now(), last_seen_at=now()
        WHERE token_hash=$1 RETURNING floor(extract(epoch FROM expires_at-now()))::int AS seconds`,
          [previous, next],
        );
        return result.rows[0]?.seconds;
      }),
  };
}
