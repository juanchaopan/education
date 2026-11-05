import { afterAll, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createSessionRepository } from './postgres-session.js';
import { createRegistrationKeyRepository } from './postgres-registration-key.js';
import { createReauthenticationRepository } from './postgres-reauthentication.js';
import { createSessionService } from '../services/session.js';
import { createRegistrationKeyService } from '../services/registration-key.js';
import { createReauthenticationService } from '../services/reauthentication.js';
import { createAuthAdmission } from './auth-admission.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { tokenHash } from '../services/session-security.js';
import { createRecoveryRepository } from './postgres-recovery.js';
import { buildApp } from '../../app.js';

if (!process.env.DATABASE_URL) throw new Error('Isolated DATABASE_URL required');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  statement_timeout: 3000,
});
const families: string[] = [];
const password = 'a test parent password for generating keys';
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});
async function fixture(verified = true) {
  const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
    .id as string;
  families.push(family);
  const email = `key-${randomUUID()}@example.test`;
  await pool.query(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,$4)',
    [family, email, await hashParentPassword(password), verified],
  );
  const admit = createAuthAdmission(pool, randomBytes(32).toString('hex'));
  const sessions = createSessionService({
    repository: createSessionRepository(pool),
    admit,
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  const repository = createRegistrationKeyRepository(pool);
  const keys = createRegistrationKeyService({ sessions, repository });
  const reauthentication = createReauthenticationService({
    sessions,
    admit,
    repository: createReauthenticationRepository(pool),
    verify: verifyParentPassword,
  });
  const login = await sessions.login({ email, password }, 'ip');
  const generate = () => keys.generate(login.token, login.view.csrfToken, 'ip');
  return { family, email, sessions, repository, keys, reauthentication, login, generate };
}
it('keeps only an 80-bit hash and 24h TTL, returns metadata after refresh and replaces older keys', async () => {
  const f = await fixture();
  const first = await f.generate();
  const row = (
    await pool.query(
      `SELECT *,extract(epoch FROM expires_at-created_at)::int ttl
    FROM registration_keys WHERE id=$1`,
      [first.key.id],
    )
  ).rows[0];
  expect(row.ttl).toBe(86400);
  expect(row.key_hash).toBe(tokenHash(first.value.replaceAll('-', '')));
  expect(JSON.stringify(row)).not.toContain(first.value.replaceAll('-', ''));
  const second = await f.generate();
  expect((await f.keys.read(f.login.token, 'ip')).key?.id).toBe(second.key.id);
  expect(JSON.stringify(await f.keys.read(f.login.token, 'ip'))).not.toContain(second.value);
  expect(
    (await pool.query('SELECT revoked_at FROM registration_keys WHERE id=$1', [first.key.id]))
      .rows[0].revoked_at,
  ).not.toBeNull();
});
it('serializes simultaneous generations across instances and enforces one pending key in SQL', async () => {
  const f = await fixture();
  const other = createRegistrationKeyRepository(pool);
  const results = await Promise.all([
    f.repository.generate(tokenHash(f.login.token), tokenHash('synthetic-one')),
    other.generate(tokenHash(f.login.token), tokenHash('synthetic-two')),
  ]);
  expect(new Set(results.map((key) => key.id)).size).toBe(2);
  expect(
    (
      await pool.query(
        `SELECT count(*)::int n FROM registration_keys
    WHERE family_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL`,
        [f.family],
      )
    ).rows[0].n,
  ).toBe(1);
  await expect(
    pool.query(
      `INSERT INTO registration_keys(family_id,key_hash,expires_at)
    VALUES($1,$2,now()+interval '1 day')`,
      [f.family, tokenHash('third-key')],
    ),
  ).rejects.toMatchObject({ code: '23505' });
});
it('scopes reads and revocation to the current family and makes own revocation repeatable', async () => {
  const a = await fixture();
  const b = await fixture();
  const key = await a.generate();
  expect((await b.keys.read(b.login.token, 'ip')).key).toBeNull();
  await expect(
    b.keys.revoke(b.login.token, b.login.view.csrfToken, key.key.id, 'ip'),
  ).rejects.toMatchObject({ statusCode: 404 });
  expect((await a.keys.read(a.login.token, 'ip')).key?.status).toBe('active');
  await a.keys.revoke(a.login.token, a.login.view.csrfToken, key.key.id, 'ip');
  await a.keys.revoke(a.login.token, a.login.view.csrfToken, key.key.id, 'ip');
  expect((await a.keys.read(a.login.token, 'ip')).key?.status).toBe('revoked');
});
it('checks expiry at database time and never revokes a consumed key', async () => {
  const f = await fixture();
  const key = await f.generate();
  await pool.query('UPDATE registration_keys SET expires_at=now() WHERE id=$1', [key.key.id]);
  expect((await f.keys.read(f.login.token, 'ip')).key?.status).toBe('expired');
  await pool.query('UPDATE registration_keys SET consumed_at=now() WHERE id=$1', [key.key.id]);
  expect((await f.keys.read(f.login.token, 'ip')).key?.status).toBe('used');
  await expect(
    f.keys.revoke(f.login.token, f.login.view.csrfToken, key.key.id, 'ip'),
  ).rejects.toMatchObject({ statusCode: 404 });
});
it('requires verified privileges and an actual password check within five minutes', async () => {
  const pending = await fixture(false);
  await expect(pending.generate()).rejects.toMatchObject({ statusCode: 403 });
  await pool.query('UPDATE parents SET email_verified=true WHERE email=$1', [pending.email]);
  await expect(pending.generate()).rejects.toMatchObject({ statusCode: 403 });
  const f = await fixture();
  await pool.query(
    "UPDATE parent_sessions SET password_verified_at=now()-interval '5 minutes' WHERE token_hash=$1",
    [tokenHash(f.login.token)],
  );
  expect((await f.keys.read(f.login.token, 'ip')).reauthenticationRequired).toBe(true);
  await pool.query('UPDATE parent_sessions SET password_verified_at=NULL WHERE token_hash=$1', [
    tokenHash(f.login.token),
  ]);
  expect((await f.keys.read(f.login.token, 'ip')).reauthenticationRequired).toBe(true);
  await expect(f.generate()).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    f.reauthentication.confirm(f.login.token, f.login.view.csrfToken, 'wrong', 'ip'),
  ).rejects.toMatchObject({ statusCode: 401 });
  const confirmed = await f.reauthentication.confirm(
    f.login.token,
    f.login.view.csrfToken,
    password,
    'ip',
  );
  await expect(f.sessions.read(f.login.token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
  expect((await f.keys.read(confirmed.token, 'ip')).reauthenticationRequired).toBe(false);
  expect(
    (await f.keys.generate(confirmed.token, confirmed.view.csrfToken, 'ip')).value,
  ).toBeTruthy();
});
it('rotates tokens without extending expiry and refuses stale password/epoch snapshots', async () => {
  const f = await fixture();
  const hash = tokenHash(f.login.token);
  const expires = (
    await pool.query('SELECT expires_at FROM parent_sessions WHERE token_hash=$1', [hash])
  ).rows[0].expires_at;
  const account = (await createSessionRepository(pool).find(f.email))!;
  const reauth = createReauthenticationRepository(pool);
  const result = await f.reauthentication.confirm(
    f.login.token,
    f.login.view.csrfToken,
    password,
    'ip',
  );
  expect(
    (
      await pool.query('SELECT expires_at FROM parent_sessions WHERE token_hash=$1', [
        tokenHash(result.token),
      ])
    ).rows[0].expires_at,
  ).toEqual(expires);
  await pool.query('UPDATE parents SET credential_version=credential_version+1 WHERE email=$1', [
    f.email,
  ]);
  await expect(
    reauth.confirm(account, tokenHash(result.token), tokenHash('stale')),
  ).rejects.toMatchObject({ statusCode: 401 });
  await expect(f.keys.read(result.token, 'ip')).rejects.toMatchObject({ statusCode: 401 });
});
it('shares generation quotas across instances, counts replacements, and preserves the last key when limited', async () => {
  const f = await fixture();
  let latest = await f.generate();
  for (let n = 1; n < 5; n++) latest = await f.generate();
  await expect(
    createRegistrationKeyRepository(pool).generate(tokenHash(f.login.token), tokenHash('limited')),
  ).rejects.toMatchObject({ statusCode: 429 });
  expect((await f.keys.read(f.login.token, 'ip')).key?.id).toBe(latest.key.id);
  await pool.query(
    "UPDATE key_generation_attempts SET attempted_at=now()-interval '2 hours' WHERE family_id=$1",
    [f.family],
  );
  await pool.query(
    `INSERT INTO key_generation_attempts(family_id,attempted_at)
    SELECT $1, now()-interval '2 hours' FROM generate_series(1,15)`,
    [f.family],
  );
  await expect(f.generate()).rejects.toMatchObject({ statusCode: 429 });
});
it('makes recovery revoke recent authentication and unused keys without touching family membership', async () => {
  const f = await fixture();
  await f.generate();
  const token = tokenHash(randomUUID());
  await createRecoveryRepository(pool).reserve(f.email, 'send', {
    id: randomUUID(),
    tokenHash: token,
    payload: 'fixture',
  });
  const concurrent = await Promise.allSettled([
    f.generate(),
    createRecoveryRepository(pool).consume(token, 'replacement-hash'),
  ]);
  expect(concurrent[1]).toMatchObject({ status: 'fulfilled', value: true });
  if (concurrent[0]!.status === 'rejected')
    expect(concurrent[0]!.reason).toMatchObject({ statusCode: 401 });
  await expect(f.generate()).rejects.toMatchObject({ statusCode: 401 });
  expect(
    (
      await pool.query('SELECT count(*)::int n FROM registration_keys WHERE family_id=$1', [
        f.family,
      ])
    ).rows[0].n,
  ).toBe(0);
  expect((await pool.query('SELECT id FROM families WHERE id=$1', [f.family])).rowCount).toBe(1);
});
it('guards HTTP identity selectors, CSRF and origin, never exposes key hashes or stores raw keys', async () => {
  const f = await fixture();
  const origin = 'https://education.example';
  const app = buildApp({
    origin,
    sessions: f.sessions,
    registrationKeys: f.keys,
    reauthentication: f.reauthentication,
  });
  const headers = {
    origin,
    'content-type': 'application/json',
    'x-education-request': 'session',
    cookie: `__Host-education_session=${f.login.token}`,
    'x-csrf-token': f.login.view.csrfToken,
  };
  try {
    for (const extra of [{ origin: 'https://evil.example' }, { 'x-csrf-token': '' }])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/parents/registration-keys',
            headers: { ...headers, ...extra },
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/parents/registration-keys',
          headers,
          payload: { familyId: randomUUID() },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ url: '/api/v1/parents/registration-keys?familyId=other', headers }))
        .statusCode,
    ).toBe(400);
    const generated = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/registration-keys',
      headers,
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    expect(generated.headers['cache-control']).toBe('no-store');
    const read = await app.inject({ url: '/api/v1/parents/registration-keys', headers });
    expect(read.body).not.toContain(generated.json().value);
    expect(read.body).not.toContain('keyHash');
  } finally {
    await app.close();
  }
});

it('rotates the secure cookie after HTTP reauthentication and invalidates the previous CSRF identity', async () => {
  const f = await fixture();
  const origin = 'https://education.example';
  const app = buildApp({
    origin,
    sessions: f.sessions,
    registrationKeys: f.keys,
    reauthentication: f.reauthentication,
  });
  const headers = {
    origin,
    'content-type': 'application/json',
    'x-education-request': 'session',
    cookie: `__Host-education_session=${f.login.token}`,
    'x-csrf-token': f.login.view.csrfToken,
  };
  try {
    const confirmed = await app.inject({
      method: 'POST',
      url: '/api/v1/parents/reauthenticate',
      headers,
      payload: { password },
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.headers['set-cookie']).toContain('Secure; HttpOnly; SameSite=Lax');
    expect(
      (await app.inject({ url: '/api/v1/parents/registration-keys', headers })).statusCode,
    ).toBe(401);
  } finally {
    await app.close();
  }
});
