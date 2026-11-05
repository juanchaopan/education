import type pg from 'pg';
import type { RegistrationKeyInfo } from '@education/contracts';
import type { RegistrationKeyRepository } from './registration-key.js';
import { withParentSession, type AuthorizedParent } from './session-transaction.js';
import { RequestError } from '../../shared/request-error.js';

const keyColumns = `id, expires_at AS "expiresAt",
  CASE WHEN consumed_at IS NOT NULL THEN 'used' WHEN revoked_at IS NOT NULL THEN 'revoked'
    WHEN expires_at <= now() THEN 'expired' ELSE 'active' END AS status`;
type Row = Omit<RegistrationKeyInfo, 'expiresAt'> & { expiresAt: Date };
const info = (row: Row): RegistrationKeyInfo => ({
  ...row,
  expiresAt: row.expiresAt.toISOString(),
});
function requireRecent(parent: AuthorizedParent) {
  if (!parent.recent) throw new RequestError(403, '请重新验证家长密码，再管理注册 KEY。');
}
async function generationBudget(client: pg.PoolClient, family: string) {
  await client.query(
    "DELETE FROM key_generation_attempts WHERE attempted_at < now()-interval '25 hours'",
  );
  const counts = (
    await client.query<{ hourly: number; daily: number }>(
      `
    SELECT count(*) FILTER (WHERE attempted_at > now()-interval '1 hour')::int AS hourly,
      count(*)::int AS daily FROM key_generation_attempts
    WHERE family_id=$1 AND attempted_at > now()-interval '24 hours'`,
      [family],
    )
  ).rows[0]!;
  if (counts.hourly >= 5 || counts.daily >= 20)
    throw new RequestError(429, '生成次数较多，请稍后再试；已有 KEY 仍可在有效期内使用。');
  await client.query('INSERT INTO key_generation_attempts(family_id) VALUES($1)', [family]);
}
export function createRegistrationKeyRepository(pool: pg.Pool): RegistrationKeyRepository {
  return {
    read: (hash) =>
      withParentSession(pool, hash, async (client, parent) => {
        const row = (
          await client.query<Row>(
            `SELECT ${keyColumns} FROM registration_keys
        WHERE family_id=$1 ORDER BY created_at DESC, id DESC LIMIT 1`,
            [parent.familyId],
          )
        ).rows[0];
        return { key: row ? info(row) : null, reauthenticationRequired: !parent.recent };
      }),
    generate: (hash, keyHash) =>
      withParentSession(pool, hash, async (client, parent) => {
        requireRecent(parent);
        await generationBudget(client, parent.familyId);
        await client.query(
          `UPDATE registration_keys SET revoked_at=now()
        WHERE family_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL`,
          [parent.familyId],
        );
        const row = (
          await client.query<Row>(
            `INSERT INTO registration_keys(family_id,key_hash,expires_at)
        VALUES($1,$2,now()+interval '24 hours') RETURNING ${keyColumns}`,
            [parent.familyId, keyHash],
          )
        ).rows[0]!;
        return info(row);
      }),
    revoke: (hash, id) =>
      withParentSession(pool, hash, async (client, parent) => {
        requireRecent(parent);
        const result = await client.query(
          `UPDATE registration_keys SET revoked_at=coalesce(revoked_at,now())
        WHERE id=$1 AND family_id=$2 AND consumed_at IS NULL RETURNING id`,
          [id, parent.familyId],
        );
        if (!result.rowCount) throw new RequestError(404, '没有可撤销的注册 KEY，请刷新状态。');
      }),
  };
}
