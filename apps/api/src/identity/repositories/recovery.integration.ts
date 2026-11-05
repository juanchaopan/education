import { afterAll, afterEach, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createRecoveryRepository } from './postgres-recovery.js';
import { createRecoveryService } from '../services/recovery.js';
import { createVerificationRepository } from './postgres-verification.js';
import { createSessionRepository } from './postgres-session.js';
import { createSessionService } from '../services/session.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { createMailPayload } from '../../shared/mail-payload.js';
import { tokenHash } from '../services/session-security.js';
import type { MailOutcome } from '../../shared/gmail.js';
if (!process.env.DATABASE_URL) throw new Error('Isolated DATABASE_URL required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const payload = createMailPayload(randomBytes(32).toString('hex'));
afterEach(async () => {
  for (const table of ['recovery_attempts', 'verification_attempts'])
    await pool.query(
      `DELETE FROM ${table} WHERE parent_id IN (SELECT id FROM parents WHERE family_id=ANY($1::uuid[]))`,
      [families],
    );
});
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});
async function fixture(outcome: MailOutcome = 'accepted') {
  const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
    .id as string;
  families.push(family);
  const email = `recovery-${randomUUID()}@example.test`;
  const id = (
    await pool.query(
      'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,true) RETURNING id',
      [family, email, 'test-only'],
    )
  ).rows[0].id as string;
  const tokens: string[] = [];
  const repository = createRecoveryRepository(pool);
  const service = createRecoveryService({
    repository,
    payload,
    admit: async (work) => work(),
    hash: hashParentPassword,
    wait: async () => {},
    sender: {
      send: async (_email, token) => {
        tokens.push(token);
        return outcome;
      },
    },
  });
  const send = (action: 'send' | 'retry' | 'resend' = 'send') =>
    service.request({ email, action }, 'ip');
  const cool = async () => {
    await pool.query(
      "UPDATE recovery_attempts SET attempted_at=now()-interval '61 seconds' WHERE parent_id=$1",
      [id],
    );
    await pool.query(
      "UPDATE password_resets SET last_attempt_at=now()-interval '61 seconds' WHERE parent_id=$1",
      [id],
    );
  };
  return { family, email, id, tokens, repository, service, send, cool };
}
it('persists only hashes after acceptance and consumes exactly once across instances', async () => {
  const f = await fixture();
  await f.send();
  const row = (
    await pool.query(
      'SELECT *,extract(epoch FROM expires_at-last_attempt_at)::int AS ttl FROM password_resets WHERE parent_id=$1',
      [f.id],
    )
  ).rows[0];
  expect(row.ttl).toBe(1800);
  expect(row.payload).toBeNull();
  expect(row.token_hash).toBe(tokenHash(f.tokens[0]!));
  expect(JSON.stringify(row)).not.toContain(f.tokens[0]!);
  const other = createRecoveryRepository(pool);
  const result = await Promise.all([
    f.repository.consume(row.token_hash, 'new-hash'),
    other.consume(row.token_hash, 'other-hash'),
  ]);
  expect(result.sort()).toEqual([false, true]);
  expect(
    (await pool.query('SELECT credential_version FROM parents WHERE id=$1', [f.id])).rows[0]
      .credential_version,
  ).toBe(2);
  expect(
    (await pool.query('SELECT auth_epoch FROM families WHERE id=$1', [f.family])).rows[0]
      .auth_epoch,
  ).toBe(2);
});
it('atomically replaces the password, revokes all family sessions and unused keys, and leaves another family intact', async () => {
  const f = await fixture(),
    other = await fixture();
  const oldPassword = 'my previous private test phrase',
    newPassword = 'my replacement private test phrase';
  await pool.query('UPDATE parents SET password_hash=$1 WHERE id=ANY($2::uuid[])', [
    await hashParentPassword(oldPassword),
    [f.id, other.id],
  ]);
  const repository = createSessionRepository(pool);
  const sessions = createSessionService({
    repository,
    admit: async (work) => work(),
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  const first = await sessions.login({ email: f.email, password: oldPassword }, 'ip');
  const second = await sessions.login({ email: f.email, password: oldPassword }, 'ip');
  const unaffected = await sessions.login({ email: other.email, password: oldPassword }, 'ip');
  const staleAccount = (await repository.find(f.email))!;
  await pool.query(
    "INSERT INTO registration_keys(family_id,key_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [f.family, randomUUID()],
  );
  await f.send();
  await f.service.reset({ token: f.tokens[0]!, password: newPassword }, 'ip');
  for (const token of [first.token, second.token])
    await expect(sessions.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
  await expect(
    sessions.login({ email: f.email, password: oldPassword }, 'ip'),
  ).rejects.toMatchObject({ statusCode: 401 });
  expect((await sessions.login({ email: f.email, password: newPassword }, 'ip')).view.access).toBe(
    'verified',
  );
  expect((await sessions.read(unaffected.token, 'ip')).email).toBe(other.email);
  expect(await repository.issue(staleAccount, tokenHash('late-old-password-login'))).toBe(false);
  expect(
    (await pool.query('SELECT id FROM registration_keys WHERE family_id=$1', [f.family])).rowCount,
  ).toBe(0);
});
it('does not change credentials for expired, superseded, used or verification-purpose tokens', async () => {
  const f = await fixture();
  await f.send();
  const old = f.tokens[0]!;
  await f.cool();
  await f.send('resend');
  expect(await f.repository.consume(tokenHash(old), 'forbidden')).toBe(false);
  await pool.query(
    "UPDATE password_resets SET expires_at=now()-interval '1 second' WHERE parent_id=$1",
    [f.id],
  );
  expect(await f.repository.consume(tokenHash(f.tokens[1]!), 'forbidden')).toBe(false);
  expect(
    (await pool.query('SELECT password_hash FROM parents WHERE id=$1', [f.id])).rows[0]
      .password_hash,
  ).toBe('test-only');
  await pool.query('UPDATE parents SET email_verified=false WHERE id=$1', [f.id]);
  const verification = createVerificationRepository(pool),
    token = randomBytes(32).toString('base64url'),
    id = randomUUID();
  await verification.reserve(f.email, 'send', {
    id,
    tokenHash: tokenHash(token),
    payload: payload.seal(id, token),
  });
  expect(await f.repository.consume(tokenHash(token), 'forbidden')).toBe(false);
});
it('ignores duplicate initial requests and throttles resend without invalidating the accepted link', async () => {
  const f = await fixture();
  await Promise.all([f.send(), f.send()]);
  expect(f.tokens).toHaveLength(1);
  await f.send('resend');
  expect(f.tokens).toHaveLength(1);
  expect(await f.repository.consume(tokenHash(f.tokens[0]!), 'new-hash')).toBe(true);
});
it('retries only an explicitly temporary failure with the same token, at most three sends', async () => {
  const f = await fixture('retryable');
  await f.send();
  for (let i = 0; i < 3; i++) {
    await f.cool();
    await f.send('retry');
  }
  expect(f.tokens).toHaveLength(3);
  expect(new Set(f.tokens).size).toBe(1);
  expect(
    (await pool.query('SELECT payload FROM password_resets WHERE parent_id=$1', [f.id])).rows[0]
      .payload,
  ).toBeNull();
});
it.each(['unknown', 'rejected', 'authorization-failed'] as const)(
  'does not blindly retry %s delivery',
  async (outcome) => {
    const f = await fixture(outcome);
    await f.send();
    await f.cool();
    await f.send('retry');
    expect(f.tokens).toHaveLength(1);
    expect(
      (await pool.query('SELECT payload FROM password_resets WHERE parent_id=$1', [f.id])).rows[0]
        .payload,
    ).toBeNull();
  },
);
it('recovers an interrupted send as unknown and requires explicit resend', async () => {
  const f = await fixture();
  const id = randomUUID(),
    token = randomBytes(32).toString('base64url');
  await f.repository.reserve(f.email, 'send', {
    id,
    tokenHash: tokenHash(token),
    payload: payload.seal(id, token),
  });
  await f.cool();
  await f.send('retry');
  expect(f.tokens).toHaveLength(0);
  expect(
    (await pool.query('SELECT status,payload FROM password_resets WHERE parent_id=$1', [f.id]))
      .rows[0],
  ).toEqual({ status: 'unknown', payload: null });
  await f.send('resend');
  expect(f.tokens).toHaveLength(1);
  expect(await f.repository.consume(tokenHash(token), 'forbidden')).toBe(false);
});
it('shares the site mail budget with verification and enforces the recovery daily budget', async () => {
  const f = await fixture(),
    other = await fixture();
  await pool.query(
    "INSERT INTO verification_attempts(parent_id,attempted_at) SELECT $1,now()-interval '1 hour' FROM generate_series(1,50)",
    [other.id],
  );
  await f.send();
  expect(f.tokens).toHaveLength(0);
  await pool.query('DELETE FROM verification_attempts WHERE parent_id=$1', [other.id]);
  await pool.query(
    "INSERT INTO recovery_attempts(parent_id,attempted_at) SELECT $1,now()-interval '1 hour' FROM generate_series(1,5)",
    [f.id],
  );
  await f.send();
  expect(f.tokens).toHaveLength(0);
});
it('resetting an unverified parent does not grant verified access or leave an old verification token usable', async () => {
  const f = await fixture();
  await pool.query('UPDATE parents SET email_verified=false WHERE id=$1', [f.id]);
  const token = randomBytes(32).toString('base64url'),
    id = randomUUID(),
    verification = createVerificationRepository(pool);
  await verification.reserve(f.email, 'send', {
    id,
    tokenHash: tokenHash(token),
    payload: payload.seal(id, token),
  });
  await f.send();
  await f.repository.consume(tokenHash(f.tokens[0]!), 'new-hash');
  expect(await verification.consume(tokenHash(token))).toBe(false);
  expect(
    (await pool.query('SELECT email_verified FROM parents WHERE id=$1', [f.id])).rows[0]
      .email_verified,
  ).toBe(false);
});

it('allows a fresh initial request after a completed reset without reusing the consumed token', async () => {
  const f = await fixture();
  await f.send();
  expect(await f.repository.consume(tokenHash(f.tokens[0]!), 'new-hash')).toBe(true);
  await f.cool();
  await f.send();
  expect(f.tokens).toHaveLength(2);
  expect(f.tokens[0]).not.toBe(f.tokens[1]);
  expect(await f.repository.consume(tokenHash(f.tokens[0]!), 'forbidden')).toBe(false);
});
