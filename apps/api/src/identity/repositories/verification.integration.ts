import { createSessionRepository } from './postgres-session.js';
import { createSessionService } from '../services/session.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { afterAll, afterEach, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createVerificationRepository } from './postgres-verification.js';
import { createVerificationService } from '../services/verification.js';
import { createMailPayload } from '../../shared/mail-payload.js';
import { tokenHash } from '../services/session-security.js';
import type { MailOutcome } from '../../shared/gmail.js';

if (!process.env.DATABASE_URL) throw new Error('Isolated DATABASE_URL required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const payload = createMailPayload(randomBytes(32).toString('hex'));
afterEach(async () => {
  await pool.query(
    'DELETE FROM verification_attempts WHERE parent_id IN (SELECT id FROM parents WHERE family_id=ANY($1::uuid[]))',
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
  const email = `verify-${randomUUID()}@example.test`;
  const id = (
    await pool.query(
      'INSERT INTO parents(family_id,email,password_hash) VALUES($1,$2,$3) RETURNING id',
      [family, email, 'test-only'],
    )
  ).rows[0].id as string;
  const tokens: string[] = [];
  const sender = {
    send: async (_email: string, token: string) => {
      tokens.push(token);
      return outcome;
    },
  };
  const repository = createVerificationRepository(pool);
  const service = createVerificationService({
    admit: async (work) => work(),
    repository,
    sender,
    payload,
  });
  const cool = async () => {
    await pool.query(
      "UPDATE verification_attempts SET attempted_at=now()-interval '61 seconds' WHERE parent_id=$1",
      [id],
    );
    await pool.query(
      "UPDATE email_verifications SET last_attempt_at=now()-interval '61 seconds' WHERE parent_id=$1",
      [id],
    );
  };
  return { id, email, service, repository, sender, tokens, cool };
}
it('persists only hashes after acceptance and consumes exactly once across two instances', async () => {
  const f = await fixture();
  await f.service.send(f.email, 'send');
  const row = (await pool.query('SELECT * FROM email_verifications WHERE parent_id=$1', [f.id]))
    .rows[0];
  expect(row.token_hash).toBe(tokenHash(f.tokens[0]!));
  expect(row.payload).toBeNull();
  expect(JSON.stringify(row)).not.toContain(f.tokens[0]!);
  const other = createVerificationRepository(pool);
  const results = await Promise.all([
    f.repository.consume(row.token_hash),
    other.consume(row.token_hash),
  ]);
  expect(results.sort()).toEqual([false, true]);
  expect(
    (await pool.query('SELECT email_verified FROM parents WHERE id=$1', [f.id])).rows[0]
      .email_verified,
  ).toBe(true);
});
it('shares cooldown across instances and explicit resend revokes the previous token', async () => {
  const f = await fixture();
  await f.service.send(f.email, 'send');
  const other = createVerificationService({
    admit: async (work) => work(),
    repository: createVerificationRepository(pool),
    sender: f.sender,
    payload,
  });
  await expect(other.send(f.email, 'resend')).rejects.toMatchObject({ statusCode: 429 });
  await f.cool();
  await other.send(f.email, 'resend');
  expect(f.tokens).toHaveLength(2);
  expect(await f.repository.consume(tokenHash(f.tokens[0]!))).toBe(false);
  expect(await f.repository.consume(tokenHash(f.tokens[1]!))).toBe(true);
});
it('retries the same protected payload at most three times, never an uncertain delivery', async () => {
  const f = await fixture('retryable');
  await f.service.send(f.email, 'send');
  expect((await f.service.status(f.email)).canRetry).toBe(true);
  for (let i = 0; i < 2; i++) {
    await f.cool();
    await f.service.send(f.email, 'retry');
  }
  expect(new Set(f.tokens).size).toBe(1);
  expect((await f.service.status(f.email)).canRetry).toBe(false);
  await f.cool();
  await expect(f.service.send(f.email, 'retry')).rejects.toMatchObject({ statusCode: 409 });
  const unknown = await fixture('unknown');
  await unknown.service.send(unknown.email, 'send');
  await unknown.cool();
  await expect(unknown.service.send(unknown.email, 'retry')).rejects.toMatchObject({
    statusCode: 409,
  });
});
it('expires tokens, clears payloads and safely recovers an interrupted invocation without blind retry', async () => {
  const f = await fixture('retryable');
  await f.service.send(f.email, 'send');
  await pool.query(
    "UPDATE email_verifications SET expires_at=now()-interval '1 second' WHERE parent_id=$1",
    [f.id],
  );
  expect((await f.service.status(f.email)).status).toBe('expired');
  expect(await f.repository.consume(tokenHash(f.tokens[0]!))).toBe(false);
  expect(
    (await pool.query('SELECT payload FROM email_verifications WHERE parent_id=$1', [f.id])).rows[0]
      .payload,
  ).toBeNull();
  const accepted = await fixture();
  await accepted.service.send(accepted.email, 'send');
  await pool.query(
    "UPDATE email_verifications SET expires_at=now()-interval '1 second' WHERE parent_id=$1",
    [accepted.id],
  );
  expect((await accepted.service.status(accepted.email)).status).toBe('expired');
  await f.cool();
  const id = randomUUID();
  await f.repository.reserve(f.email, 'resend', {
    id,
    tokenHash: tokenHash('interrupted'),
    payload: payload.seal(id, 'interrupted'),
  });
  await f.cool();
  expect((await f.service.status(f.email)).status).toBe('unknown');
  await expect(f.service.send(f.email, 'retry')).rejects.toMatchObject({ statusCode: 409 });
});
it('enforces the per-parent daily limit and serializes concurrent initial requests', async () => {
  const f = await fixture();
  const results = await Promise.allSettled([
    f.service.send(f.email, 'send'),
    f.service.send(f.email, 'send'),
  ]);
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  await pool.query(
    "INSERT INTO verification_attempts(parent_id,attempted_at) SELECT $1,now()-interval '1 hour' FROM generate_series(1,4)",
    [f.id],
  );
  await f.cool();
  await expect(f.service.send(f.email, 'resend')).rejects.toMatchObject({ statusCode: 429 });
});

it('requires password login after mailbox verification and never upgrades an existing restricted session', async () => {
  const f = await fixture();
  const password = 'a private test phrase for verification';
  await pool.query('UPDATE parents SET password_hash=$1 WHERE id=$2', [
    await hashParentPassword(password),
    f.id,
  ]);
  const sessions = createSessionService({
    repository: createSessionRepository(pool),
    admit: async (work) => work(),
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  const restricted = await sessions.login({ email: f.email, password }, 'ip');
  await f.service.send(f.email, 'send');
  await f.service.consume(f.tokens[0]!, 'ip');
  expect((await sessions.read(restricted.token, 'ip')).access).toBe('verification-only');
  const verified = await sessions.login({ email: f.email, password }, 'ip', restricted.token);
  expect(verified.view.access).toBe('verified');
  await expect(sessions.read(restricted.token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('shares global daily and burst limits between different families', async () => {
  const first = await fixture();
  const second = await fixture();
  await pool.query(
    "INSERT INTO verification_attempts(parent_id,attempted_at) SELECT $1,now()-interval '1 hour' FROM generate_series(1,50)",
    [first.id],
  );
  await expect(second.service.send(second.email, 'send')).rejects.toMatchObject({
    statusCode: 429,
  });
  await pool.query('DELETE FROM verification_attempts WHERE parent_id=$1', [first.id]);
  await pool.query(
    'INSERT INTO verification_attempts(parent_id) SELECT $1 FROM generate_series(1,10)',
    [first.id],
  );
  await expect(second.service.send(second.email, 'send')).rejects.toMatchObject({
    statusCode: 429,
  });
  expect(second.tokens).toHaveLength(0);
});
