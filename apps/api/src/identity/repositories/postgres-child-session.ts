import type pg from 'pg';
import type { ChildAccount } from '../domain/child-session.js';
import type { ChildSessionRepository } from './child-session.js';
import { transaction } from './transaction.js';

const columns = `c.id,c.family_id AS "familyId",c.nickname,c.pin_hash AS "pinHash",
  c.pin_pepper_version AS "pinPepperVersion",c.credential_version AS "credentialVersion",f.auth_epoch AS "familyEpoch"`;
export function createChildSessionRepository(pool: pg.Pool): ChildSessionRepository {
  return {
    find: async (code, nickname) =>
      (
        await pool.query<ChildAccount>(
          `SELECT ${columns}
      FROM children c JOIN families f ON c.family_id=f.id WHERE f.code=$1 AND c.canonical_nickname=$2`,
          [code, nickname],
        )
      ).rows[0],
    issue: (account, hash, previous) => issue(pool, account, hash, previous),
    read: (hash) => read(pool, hash),
    revoke: async (hash) => {
      await pool.query('DELETE FROM child_sessions WHERE token_hash=$1', [hash]);
    },
  };
}
function issue(pool: pg.Pool, account: ChildAccount, hash: string, previous?: string) {
  return transaction(pool, async (client) => {
    // Family → child → session order agrees with parent-authorized family writes.
    await client.query('SELECT id FROM families WHERE id=$1 FOR SHARE', [account.familyId]);
    const current = (
      await client.query<ChildAccount>(
        `SELECT ${columns} FROM children c JOIN families f ON c.family_id=f.id
      WHERE c.id=$1 AND c.family_id=$2 FOR SHARE OF c`,
        [account.id, account.familyId],
      )
    ).rows[0];
    if (!current || !sameCredentials(current, account)) return false;
    await client.query('DELETE FROM child_sessions WHERE expires_at<=clock_timestamp()');
    if (previous) {
      await client.query('DELETE FROM parent_sessions WHERE token_hash=$1', [previous]);
      await client.query('DELETE FROM child_sessions WHERE token_hash=$1', [previous]);
    }
    await client.query(
      `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
      VALUES($1,$2,$3,$4,clock_timestamp()+interval '180 days')`,
      [hash, account.id, account.credentialVersion, account.familyEpoch],
    );
    return true;
  });
}
function sameCredentials(current: ChildAccount, expected: ChildAccount) {
  return (
    current.pinHash === expected.pinHash &&
    current.pinPepperVersion === 1 &&
    current.credentialVersion === expected.credentialVersion &&
    current.familyEpoch === expected.familyEpoch
  );
}
function read(pool: pg.Pool, hash: string) {
  return transaction(pool, async (client) => {
    const owner = (
      await client.query<{ child_id: string; family_id: string }>(
        `SELECT c.id AS child_id,c.family_id
      FROM child_sessions s JOIN children c ON c.id=s.child_id WHERE s.token_hash=$1`,
        [hash],
      )
    ).rows[0];
    if (!owner) return;
    await client.query('SELECT id FROM families WHERE id=$1 FOR SHARE', [owner.family_id]);
    await client.query('SELECT id FROM children WHERE id=$1 FOR SHARE', [owner.child_id]);
    return (
      await client.query<{ nickname: string }>(
        `UPDATE child_sessions s
      SET last_seen_at=clock_timestamp(),expires_at=clock_timestamp()+interval '180 days'
      FROM children c,families f WHERE s.token_hash=$1 AND s.child_id=c.id AND c.family_id=f.id
      AND c.family_id=$2 AND c.pin_pepper_version=1 AND s.credential_version=c.credential_version
      AND s.family_epoch=f.auth_epoch AND s.expires_at>clock_timestamp()
      AND s.last_seen_at>clock_timestamp()-interval '180 days' RETURNING c.nickname`,
        [hash, owner.family_id],
      )
    ).rows[0];
  });
}
