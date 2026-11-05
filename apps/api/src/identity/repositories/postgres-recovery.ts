import type pg from 'pg';
import type { RecoveryRequest } from '@education/contracts';
import type { RecoveryRepository } from './recovery.js';
import type { VerificationDraft } from './verification.js';
import { reserveMailBudget } from './mail-budget.js';
import { transaction } from './transaction.js';
type Row = VerificationDraft & {
  status: string;
  attempts: number;
  expired: boolean;
  busy: boolean;
};
export function createRecoveryRepository(pool: pg.Pool): RecoveryRepository {
  return {
    reserve: (email, action, draft) => reserve(pool, email, action, draft),
    finish: async (id, outcome) => {
      await pool.query(
        `UPDATE password_resets SET status=$2,
        payload=CASE WHEN $2='retryable' AND attempts<3 AND expires_at>now() THEN payload ELSE NULL END
        WHERE id=$1 AND status='sending'`,
        [id, outcome],
      );
    },
    consume: (hash, passwordHash) => consume(pool, hash, passwordHash),
  };
}
async function consume(pool: pg.Pool, hash: string, passwordHash: string) {
  return transaction(pool, async (client) => {
    const parent = (
      await client.query<{ id: string; family_id: string }>(
        `SELECT p.id,p.family_id FROM parents p
      JOIN password_resets r ON r.parent_id=p.id WHERE r.token_hash=$1 FOR UPDATE OF p`,
        [hash],
      )
    ).rows[0];
    if (!parent) return false;
    await client.query('SELECT id FROM families WHERE id=$1 FOR UPDATE', [parent.family_id]);
    const result = await client.query(
      `UPDATE password_resets SET consumed_at=now(),payload=NULL,status='reset'
      WHERE parent_id=$1 AND token_hash=$2 AND expires_at>now() AND consumed_at IS NULL RETURNING id`,
      [parent.id, hash],
    );
    if (result.rowCount !== 1) return false;
    await client.query(
      'UPDATE parents SET password_hash=$1,credential_version=credential_version+1 WHERE id=$2',
      [passwordHash, parent.id],
    );
    await client.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [
      parent.family_id,
    ]);
    await client.query(
      'DELETE FROM child_sessions WHERE child_id IN (SELECT id FROM children WHERE family_id=$1)',
      [parent.family_id],
    );
    await client.query(
      'DELETE FROM parent_sessions WHERE parent_id IN (SELECT id FROM parents WHERE family_id=$1)',
      [parent.family_id],
    );
    await client.query('DELETE FROM registration_keys WHERE family_id=$1 AND consumed_at IS NULL', [
      parent.family_id,
    ]);
    for (const table of ['password_resets', 'email_verifications']) {
      await client.query(
        `UPDATE ${table} SET payload=NULL,expires_at=now(),status='expired'
        WHERE parent_id IN (SELECT id FROM parents WHERE family_id=$1) AND consumed_at IS NULL`,
        [parent.family_id],
      );
    }
    return true;
  });
}

function canReserve(action: RecoveryRequest['action'], current?: Row) {
  if (current?.busy) return false;
  if (action === 'send') return !current || current.expired || current.status === 'reset';
  if (action === 'resend') return true;
  return retryable(current);
}
function retryable(current?: Row) {
  return (
    !!current &&
    current.status === 'retryable' &&
    !current.expired &&
    !!current.payload &&
    current.attempts < 3
  );
}

function reserve(
  pool: pg.Pool,
  email: string,
  action: RecoveryRequest['action'],
  draft: VerificationDraft,
) {
  return transaction(pool, async (client) => {
    const parent = (
      await client.query<{ id: string }>('SELECT id FROM parents WHERE email=$1 FOR UPDATE', [
        email,
      ])
    ).rows[0];
    if (!parent) return;
    await client.query(
      `UPDATE password_resets SET payload=NULL,status=CASE WHEN expires_at<=now() THEN 'expired' ELSE 'unknown' END
        WHERE parent_id=$1 AND consumed_at IS NULL AND (expires_at<=now() OR (status='sending' AND last_attempt_at<=now()-interval '60 seconds'))`,
      [parent.id],
    );
    const current = (
      await client.query<Row>(
        `SELECT id,token_hash AS "tokenHash",payload,status,attempts,
        expires_at<=now() AS expired,status='sending' AND last_attempt_at>now()-interval '60 seconds' AS busy
        FROM password_resets WHERE parent_id=$1`,
        [parent.id],
      )
    ).rows[0];
    if (!canReserve(action, current)) return;
    await reserveMailBudget(client, parent.id, 'recovery');
    if (action === 'retry') {
      await client.query(
        "UPDATE password_resets SET status='sending',attempts=attempts+1,last_attempt_at=now() WHERE parent_id=$1",
        [parent.id],
      );
      return { ...current!, email };
    }
    await client.query(
      `INSERT INTO password_resets(parent_id,id,token_hash,payload,status,expires_at)
        VALUES($1,$2,$3,$4,'sending',now()+interval '30 minutes') ON CONFLICT(parent_id) DO UPDATE SET
        id=excluded.id,token_hash=excluded.token_hash,payload=excluded.payload,status='sending',attempts=1,
        expires_at=excluded.expires_at,last_attempt_at=now(),consumed_at=NULL`,
      [parent.id, draft.id, draft.tokenHash, draft.payload],
    );
    return { ...draft, email };
  });
}
