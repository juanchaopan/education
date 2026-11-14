import { afterAll, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { createSessionRepository } from './postgres-session.js';
import { createAuthAdmission } from './auth-admission.js';
import { createSessionService } from '../services/session.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { buildApp } from '../../app.js';

if (!process.env.DATABASE_URL) throw new Error('An isolated DATABASE_URL is required');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  statement_timeout: 3000,
});
const repository = createSessionRepository(pool);
const families: string[] = [];
const password = 'a secret phrase for parent authentication';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});
async function setup(verified = false) {
  const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
    .id as string;
  families.push(family);
  const email = `session-${randomUUID()}@example.test`;
  await pool.query(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,$4)',
    [family, email, await hashParentPassword(password), verified],
  );
  const secret = randomUUID();
  const admit = createAuthAdmission(pool, secret);
  const service = createSessionService({
    repository,
    admit,
    verify: verifyParentPassword,
    dummyHash: await hashParentPassword('test-only-dummy-password'),
  });
  const input = { email, password };
  return { family, email, input, secret, admit, service };
}
it('stores only hashes, rotates old cookie and revokes logout across independent service instances', async () => {
  const { service, input, secret } = await setup(true);
  const first = await service.login(input, '127.0.0.1');
  expect(first.maxAge).toBe(604800);
  expect(
    (await pool.query('SELECT * FROM parent_sessions WHERE token_hash=$1', [digest(first.token)]))
      .rows[0].token_hash,
  ).not.toBe(first.token);
  const second = await service.login(input, '127.0.0.1', first.token);
  await expect(service.read(first.token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
  const other = createSessionService({
    repository: createSessionRepository(pool),
    admit: createAuthAdmission(pool, secret),
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  expect((await other.read(second.token, 'ip')).access).toBe('verified');
  await other.logout(second.token, second.view.csrfToken, 'ip');
  await expect(service.read(second.token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('limits unverified sessions to 15 minutes and never upgrades an existing restricted session', async () => {
  const { service, input } = await setup();
  const { token } = await service.login(input, 'ip');
  expect((await service.read(token, 'ip')).access).toBe('verification-only');
  await pool.query('UPDATE parents SET email_verified=true WHERE email=$1', [input.email]);
  expect((await service.read(token, 'ip')).access).toBe('verification-only');
  await pool.query(
    "UPDATE parent_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
    [digest(token)],
  );
  await expect(service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('enforces idle and absolute expiry, credential versions and family epochs in the database', async () => {
  const { service, input, family } = await setup(true);
  for (const clause of [
    "last_seen_at=now()-interval '13 hours'",
    "expires_at=now()-interval '1 second'",
    'credential_version=0',
    'family_epoch=0',
  ]) {
    const { token } = await service.login(input, 'ip');
    await pool.query(`UPDATE parent_sessions SET ${clause} WHERE token_hash=$1`, [digest(token)]);
    await expect(service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
  }
  const { token } = await service.login(input, 'ip');
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [family]);
  await expect(service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('rechecks credentials and family epoch atomically before issuing a session', async () => {
  const { input, family } = await setup();
  const original = (await repository.find(input.email))!;
  await pool.query('UPDATE parents SET credential_version=credential_version+1 WHERE email=$1', [
    input.email,
  ]);
  expect(await repository.issue(original, digest('must-not-be-issued'))).toBe(false);
  const current = (await repository.find(input.email))!;
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [family]);
  expect(await repository.issue(current, digest('must-not-be-issued-either'))).toBe(false);
});
it('shares failed login, registration and per-source budgets across instances', async () => {
  const { service, input, secret, admit } = await setup();
  for (let index = 0; index < 9; index++) await admit(async () => {}, input.email, 'ip');
  await expect(service.login({ ...input, password: 'incorrect' }, 'ip')).rejects.toMatchObject({
    statusCode: 401,
  });
  const second = createAuthAdmission(pool, secret);
  await expect(second(async () => {}, input.email, 'other-ip')).rejects.toMatchObject({
    statusCode: 429,
  });
});
it('returns own account only, denies old cookies and cross-site writes using real HTTP and SQL', async () => {
  const first = await setup(true);
  const second = await setup();
  const origin = 'https://education.example';
  const app = buildApp({ origin, sessions: first.service });
  const headers = { origin, 'content-type': 'application/json', 'x-education-request': 'session' };
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/login',
      headers,
      payload: first.input,
    });
    expect(login.statusCode).toBe(200);
    const cookie = String(login.headers['set-cookie']).split(';')[0]!;
    const own = await app.inject({ url: '/api/v1/session', headers: { cookie } });
    expect(own.json().email).toBe(first.email);
    expect(own.body).not.toContain(second.email);
    const csrf = own.json().csrfToken as string;
    const url = '/api/v1/parents/logout';
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers: { ...headers, cookie, 'x-csrf-token': 'wrong' },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers: { ...headers, cookie, 'x-csrf-token': csrf },
          payload: {},
        })
      ).statusCode,
    ).toBe(204);
    expect((await app.inject({ url: '/api/v1/session', headers: { cookie } })).statusCode).toBe(
      401,
    );
  } finally {
    await app.close();
  }
});

it('limits missing and invalid session attempts by source without creating a shared empty-email bucket', async () => {
  const { service } = await setup();
  for (let count = 0; count < 30; count++)
    await expect(service.read(undefined, 'isolated-source')).rejects.toMatchObject({
      statusCode: 401,
    });
  await expect(service.read('x'.repeat(43), 'isolated-source')).rejects.toMatchObject({
    statusCode: 429,
  });
  await expect(service.read(undefined, 'another-source')).rejects.toMatchObject({
    statusCode: 401,
  });
});

it('revokes a verified session if its parent verification is removed', async () => {
  const { service, input } = await setup(true);
  const { token } = await service.login(input, 'ip');
  await pool.query('UPDATE parents SET email_verified=false WHERE email=$1', [input.email]);
  await expect(service.read(token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('reads the session for a page and logs out without spending login attempts', async () => {
  const { service, input } = await setup(true);
  const origin = 'https://education.example';
  const app = buildApp({ origin, sessions: service });
  const headers = { origin, 'content-type': 'application/json', 'x-education-request': 'session' };
  const attempts = async () =>
    (
      await pool.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM registration_attempts',
      )
    ).rows[0]!.count;
  try {
    const before = await attempts();
    const invalid = { cookie: `__Host-education_session=${'x'.repeat(43)}` };
    for (let index = 0; index < 40; index++)
      for (const cookie of [{}, invalid]) {
        const read = await app.inject({ url: '/api/v1/session', headers: cookie });
        expect(read.statusCode).toBe(401);
        const logout = await app.inject({
          method: 'POST',
          url: '/api/v1/parents/logout',
          headers: { ...headers, ...cookie, 'x-csrf-token': 'x'.repeat(43) },
          payload: {},
        });
        expect(logout.statusCode).toBe(401);
      }
    expect(await attempts()).toBe(before);
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/login',
      headers,
      payload: input,
    });
    expect(login.statusCode).toBe(200);
  } finally {
    await app.close();
  }
});
