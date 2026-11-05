import { createHmac } from 'node:crypto';
import type pg from 'pg';
import type { ChildAccess } from '@education/contracts';
import type { ChildAccessRepository } from './child-access.js';
import { withParentSession } from './session-transaction.js';
import { RequestError } from '../../shared/request-error.js';

export function createChildAccessRepository(
  pool: pg.Pool,
  rateLimitKey: string,
): ChildAccessRepository {
  return {
    list: (hash) =>
      withParentSession(pool, hash, async (client, parent) => ({
        children: (
          await client.query<ChildAccess>(
            'SELECT id,nickname,credential_version AS "credentialVersion" FROM children WHERE family_id=$1 ORDER BY nickname,id',
            [parent.familyId],
          )
        ).rows,
        reauthenticationRequired: !parent.recent,
      })),
    reset: (hash, input, hashPin) =>
      withParentSession(pool, hash, async (client, parent) => {
        if (!parent.recent) throw new RequestError(403, '请重新验证家长密码，再重置孩子 PIN。');
        const child = (
          await client.query<{
            id: string;
            canonical_nickname: string;
            pin_hash: string;
            credential_version: number;
          }>(
            'SELECT id,canonical_nickname,credential_version,pin_hash FROM children WHERE id=$1 AND family_id=$2 FOR UPDATE',
            [input.childId, parent.familyId],
          )
        ).rows[0];
        if (!child) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
        if (child.credential_version !== input.credentialVersion)
          throw new RequestError(409, '孩子的 PIN 已有更新，请刷新状态；本次没有再次修改。');
        const pinHash = await hashPin(parent.familyId, child.id, child.pin_hash);
        // Recheck the five-minute window after hashing, using database wall time.
        const recent = (
          await client.query<{ recent: boolean }>(
            "SELECT password_verified_at>clock_timestamp()-interval '5 minutes' AND expires_at>clock_timestamp() AS recent FROM parent_sessions WHERE token_hash=$1",
            [hash],
          )
        ).rows[0]?.recent;
        if (!recent) throw new RequestError(403, '请重新验证家长密码，再重置孩子 PIN。');
        await client.query(
          'UPDATE children SET pin_hash=$1,pin_pepper_version=1,credential_version=credential_version+1 WHERE id=$2',
          [pinHash, child.id],
        );
        await client.query('DELETE FROM child_sessions WHERE child_id=$1', [child.id]);
        await clearChildAttempts(client, parent.familyId, child.canonical_nickname, rateLimitKey);
      }),
  };
}

async function clearChildAttempts(
  client: pg.PoolClient,
  familyId: string,
  nickname: string,
  secret: string,
) {
  const family = (
    await client.query<{ code: string | null }>('SELECT code FROM families WHERE id=$1', [familyId])
  ).rows[0]!;
  if (!family.code) return;
  const bucket = createHmac('sha256', secret)
    .update(`child:${JSON.stringify([family.code, nickname])}`)
    .digest('hex');
  // The same lock protects admission reservations; source/family/global budgets remain intact.
  await client.query('SELECT pg_advisory_xact_lock(1717,0)');
  await client.query('DELETE FROM registration_attempts WHERE bucket=$1', [bucket]);
}
