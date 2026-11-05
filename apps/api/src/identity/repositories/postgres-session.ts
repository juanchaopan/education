import { accountColumns, currentSession } from './session-query.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import type { ParentAccount } from '../domain/session.js';
import type { SessionRepository } from './session.js';

export function createSessionRepository(pool: pg.Pool): SessionRepository {
  const db = drizzle(pool);
  return {
    find: async (email) =>
      (
        await db.execute<ParentAccount>(sql`SELECT ${accountColumns}
      FROM parents p JOIN families f ON f.id=p.family_id WHERE p.email=${email}`)
      ).rows[0],
    issue: async (account, hash, previousHash) =>
      db.transaction(async (tx) => {
        const current = (
          await tx.execute<ParentAccount>(sql`SELECT ${accountColumns}
        FROM parents p JOIN families f ON f.id=p.family_id WHERE p.id=${account.id}
        FOR SHARE OF p, f`)
        ).rows[0];
        if (
          !current ||
          current.passwordHash !== account.passwordHash ||
          current.credentialVersion !== account.credentialVersion ||
          current.familyEpoch !== account.familyEpoch ||
          current.emailVerified !== account.emailVerified
        )
          return false;
        await tx.execute(sql`DELETE FROM parent_sessions WHERE expires_at <= now()`);
        if (previousHash)
          await tx.execute(sql`DELETE FROM parent_sessions WHERE token_hash=${previousHash}`);
        await tx.execute(sql`INSERT INTO parent_sessions
        (token_hash, parent_id, credential_version, family_epoch, verified, password_verified_at, expires_at)
        VALUES (${hash}, ${account.id}, ${account.credentialVersion}, ${account.familyEpoch}, ${account.emailVerified}, now(),
          now() + CASE WHEN ${account.emailVerified} THEN interval '7 days' ELSE interval '15 minutes' END)`);
        return true;
      }),
    read: async (hash) =>
      (
        await db.execute<{
          email: string;
          emailVerified: boolean;
          access: 'verified' | 'verification-only';
        }>(sql`
      UPDATE parent_sessions s SET last_seen_at=now()
      FROM parents p, families f
      WHERE s.token_hash=${hash} AND ${currentSession}
      RETURNING p.email, p.email_verified AS "emailVerified",
        CASE WHEN s.verified AND p.email_verified THEN 'verified' ELSE 'verification-only' END AS access`)
      ).rows[0],
    revoke: async (hash) => {
      await db.execute(sql`DELETE FROM parent_sessions WHERE token_hash=${hash}`);
    },
  };
}
