import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { transaction } from './transaction.js';
import { accountColumns, currentSession } from './session-query.js';
import type { ParentAccount } from '../domain/session.js';
import { RequestError } from '../../shared/request-error.js';

export type AuthorizedParent = ParentAccount & { recent: boolean };
export function withParentSession<T>(
  pool: pg.Pool,
  hash: string,
  work: (client: pg.PoolClient, parent: AuthorizedParent) => Promise<T>,
) {
  return transaction(pool, async (client) => {
    const db = drizzle(client);
    const parent = (
      await db.execute<{ id: string }>(sql`
      SELECT parent_id AS id FROM parent_sessions WHERE token_hash=${hash}`)
    ).rows[0];
    if (!parent) throw new RequestError(401, '登录状态已失效，请重新登录。');
    // Recovery and family writes use parent → family → session lock order.
    await db.execute(sql`SELECT id FROM parents WHERE id=${parent.id} FOR SHARE`);
    await db.execute(sql`SELECT f.id FROM families f JOIN parents p ON p.family_id=f.id
      WHERE p.id=${parent.id} FOR UPDATE OF f`);
    const account = (
      await db.execute<AuthorizedParent>(sql`
      SELECT ${accountColumns},
        coalesce(s.password_verified_at > clock_timestamp()-interval '5 minutes',false) AS recent
      FROM parent_sessions s JOIN parents p ON s.parent_id=p.id JOIN families f ON p.family_id=f.id
      WHERE s.token_hash=${hash} AND ${currentSession} AND s.verified AND p.email_verified
      FOR UPDATE OF s`)
    ).rows[0];
    if (!account) throw new RequestError(401, '登录状态已失效，请重新登录。');
    return work(client, account);
  });
}
