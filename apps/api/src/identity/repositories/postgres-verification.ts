import type pg from 'pg';
import type { VerificationStatus } from '@education/contracts';
import type { VerificationRepository, VerificationDraft } from './verification.js';
import { reserveVerificationBudget, verificationTransaction } from './verification-budget.js';
import { RequestError } from '../../shared/request-error.js';

type Row = VerificationDraft & {
  status: string;
  attempts: number;
  expired: boolean;
  busy: boolean;
};
const cleanup = `UPDATE email_verifications SET payload=NULL,
  status=CASE WHEN consumed_at IS NOT NULL THEN 'verified' WHEN expires_at<=now() THEN 'expired' ELSE 'unknown' END
  WHERE parent_id=(SELECT id FROM parents WHERE email=$1) AND (expires_at<=now() OR consumed_at IS NOT NULL OR
    (status='sending' AND last_attempt_at<=now()-interval '60 seconds')) AND status NOT IN ('verified','expired')`;

export function createVerificationRepository(pool: pg.Pool): VerificationRepository {
  return {
    reserve: (email, mode, draft) =>
      verificationTransaction(pool, async (client) => {
        const parent = (
          await client.query<{ id: string; email_verified: boolean }>(
            'SELECT id,email_verified FROM parents WHERE email=$1 FOR UPDATE',
            [email],
          )
        ).rows[0];
        if (!parent || parent.email_verified)
          throw new RequestError(409, '邮箱已验证或账号不可用，请刷新账号状态。');
        await client.query(cleanup, [email]);
        const current = (
          await client.query<Row>(
            `SELECT id, token_hash AS "tokenHash", payload, status, attempts,
        expires_at<=now() AS expired, status='sending' AND last_attempt_at>now()-interval '60 seconds' AS busy
        FROM email_verifications WHERE parent_id=$1`,
            [parent.id],
          )
        ).rows[0];
        validateAction(mode, current);
        await reserveVerificationBudget(client, parent.id);
        if (mode === 'retry') {
          await client.query(
            "UPDATE email_verifications SET status='sending',attempts=attempts+1,last_attempt_at=now() WHERE parent_id=$1",
            [parent.id],
          );
          return { ...current!, email };
        }
        await client.query(
          `INSERT INTO email_verifications(parent_id,id,token_hash,payload,status,expires_at)
        VALUES($1,$2,$3,$4,'sending',now()+interval '24 hours') ON CONFLICT(parent_id) DO UPDATE SET
        id=excluded.id,token_hash=excluded.token_hash,payload=excluded.payload,status='sending',attempts=1,
        expires_at=excluded.expires_at,last_attempt_at=now(),consumed_at=NULL`,
          [parent.id, draft.id, draft.tokenHash, draft.payload],
        );
        return { ...draft, email };
      }),
    finish: async (id, outcome) => {
      await pool.query(
        `UPDATE email_verifications SET status=$2,
        payload=CASE WHEN $2='retryable' AND attempts<3 AND expires_at>now() THEN payload ELSE NULL END
        WHERE id=$1 AND status='sending'`,
        [id, outcome],
      );
    },
    consume: (hash) => consume(pool, hash),
    status: createStatusReader(pool),
  };
}
function validateAction(mode: string, current?: Row) {
  if (current?.busy) throw new RequestError(409, '邮件正在处理，请稍后刷新状态。');
  if (mode === 'send' && current)
    throw new RequestError(409, '已有发送记录，请刷新状态后选择重发。');
  if (mode === 'retry' && !canRetry(current))
    throw new RequestError(409, '这次发送无法安全重试。请检查收件箱，或明确重新发送一封新邮件。');
}
function canRetry(current?: Row) {
  return (
    !!current &&
    current.status === 'retryable' &&
    !current.expired &&
    !!current.payload &&
    current.attempts < 3
  );
}
async function consume(pool: pg.Pool, hash: string) {
  return verificationTransaction(pool, async (client) => {
    const parent = (
      await client.query<{ id: string }>(
        `SELECT p.id FROM parents p
      JOIN email_verifications v ON v.parent_id=p.id WHERE v.token_hash=$1 FOR UPDATE OF p`,
        [hash],
      )
    ).rows[0];
    if (!parent) return false;
    const claimed = await client.query(
      `UPDATE email_verifications SET consumed_at=now(),payload=NULL,status='verified'
      WHERE parent_id=$1 AND token_hash=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING id`,
      [parent.id, hash],
    );
    if (claimed.rowCount !== 1) return false;
    await client.query('UPDATE parents SET email_verified=true WHERE id=$1', [parent.id]);
    // A verification link proves mailbox access; password login is still required to grant a session.
    return true;
  });
}

function createStatusReader(pool: pg.Pool) {
  return async (email: string) => {
    await pool.query(cleanup, [email]);
    const row = (
      await pool.query<VerificationStatus>(
        `SELECT true AS enabled,
        CASE WHEN p.email_verified THEN 'verified' ELSE coalesce(v.status,'not-sent') END AS status,
        coalesce(greatest(0,ceil(extract(epoch FROM v.last_attempt_at+interval '60 seconds'-now())))::int,0) AS "retryAfter",
        coalesce(v.status='retryable' AND v.payload IS NOT NULL AND v.attempts<3 AND v.expires_at>now(),false) AS "canRetry"
        FROM parents p LEFT JOIN email_verifications v ON v.parent_id=p.id WHERE p.email=$1`,
        [email],
      )
    ).rows[0];
    if (!row) throw new RequestError(401, '请重新登录。');
    return row;
  };
}
