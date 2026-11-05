import { groupRegistrationCode } from '../domain/registration-code.js';
import { randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import type {
  ChildRegistrationRepository,
  ChildRegistrationAttempt,
} from './child-registration.js';
import { transaction } from './transaction.js';
import { RequestError } from '../../shared/request-error.js';

const unavailable = () =>
  new RequestError(
    409,
    '这个 KEY 已使用、已撤销或已过期。若刚刚注册过，请保留昵称与 PIN；否则请家长生成新的 KEY。',
  );
const conflict = () =>
  new RequestError(409, '这次提交的信息与上次不同，请检查后重试；不要重复创建账号。');
function code() {
  return Array.from(randomBytes(12), (byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte & 31]).join(
    '',
  );
}
function receipt(familyCode: string, nickname: string) {
  return {
    status: 'registered' as const,
    familyCode: groupRegistrationCode(familyCode),
    nickname,
  };
}
async function replay(client: pg.PoolClient, input: ChildRegistrationAttempt) {
  const row = (
    await client.query<{ fingerprint: string; nickname: string; code: string }>(
      `
    SELECT r.fingerprint,c.nickname,f.code FROM child_registrations r
    JOIN children c ON c.id=r.child_id JOIN families f ON f.id=c.family_id
    WHERE r.request_hash=$1 AND r.created_at > now()-interval '24 hours'`,
      [input.requestHash],
    )
  ).rows[0];
  if (!row) return;
  if (row.fingerprint !== input.fingerprint) throw conflict();
  return receipt(row.code, row.nickname);
}
async function consume(client: pg.PoolClient, input: ChildRegistrationAttempt, key: string) {
  const row = (
    await client.query<{ family_id: string }>(
      `
    UPDATE registration_keys SET consumed_at=now()
    WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > clock_timestamp()
    RETURNING family_id`,
      [key],
    )
  ).rows[0];
  if (!row) throw unavailable();
  const exists = await client.query(
    'SELECT id FROM children WHERE family_id=$1 AND canonical_nickname=$2',
    [row.family_id, input.canonical],
  );
  if (exists.rowCount)
    throw new RequestError(409, '这个家庭里已有相同昵称，请换一个喜欢的昵称再试。');
  return row.family_id;
}
export function createChildRegistrationRepository(pool: pg.Pool): ChildRegistrationRepository {
  return {
    redeem: async (input, hashPin) => {
      try {
        return await transaction(pool, async (client) => {
          const key = (
            await client.query<{ id: string; family_id: string }>(
              'SELECT id,family_id FROM registration_keys WHERE key_hash=$1',
              [input.keyHash],
            )
          ).rows[0];
          if (!key) throw unavailable();
          // Family serialization matches key replacement/revocation and password recovery.
          await client.query('SELECT id FROM families WHERE id=$1 FOR UPDATE', [key.family_id]);
          const prior = await replay(client, input);
          if (prior) return prior;
          const family = await consume(client, input, key.id);
          const child = randomUUID();
          const hash = await hashPin(family, child);
          await client.query(
            `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version) VALUES($1,$2,$3,$4,$5,1)`,
            [child, family, input.nickname, input.canonical, hash],
          );
          const row = (
            await client.query<{ code: string }>(
              'UPDATE families SET code=coalesce(code,$2) WHERE id=$1 RETURNING code',
              [family, code()],
            )
          ).rows[0]!;
          await client.query(
            `INSERT INTO child_registrations(request_hash,fingerprint,child_id,key_id) VALUES($1,$2,$3,$4)`,
            [input.requestHash, input.fingerprint, child, key.id],
          );
          await client.query(
            "DELETE FROM child_registrations WHERE created_at < now()-interval '25 hours'",
          );
          return receipt(row.code, input.nickname);
        });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw conflict();
        throw error;
      }
    },
  };
}
