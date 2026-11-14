import { afterAll, expect, it } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createChildAccessRepository } from './postgres-child-access.js';
import { createChildSessionRepository } from './postgres-child-session.js';
import { createSessionRepository } from './postgres-session.js';
import { createChildSessionService } from '../services/child-session.js';
import { createSessionService } from '../services/session.js';
import { createChildAccessService } from '../services/child-access.js';
import { createAuthAdmission } from './auth-admission.js';
import { createChildPin, createPinMaterial, createReplacementPin } from '../services/child-pin.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { tokenHash } from '../services/session-security.js';
import { buildApp } from '../../app.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  statement_timeout: 3000,
});
const families: string[] = [];
const pepper = 'ab'.repeat(32),
  pin = '018274',
  nextPin = '937261';
const headers = {
  origin: 'https://education.example',
  'content-type': 'application/json',
  'x-education-request': 'session',
};
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function setup(verified = true) {
  const family = randomUUID(),
    child = randomUUID(),
    sibling = randomUUID();
  const code = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [family, code]);
  const email = `${randomUUID()}@example.test`,
    password = 'a test parent password for child reset';
  await pool.query(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,$4)',
    [family, email, await hashParentPassword(password), verified],
  );
  for (const [id, name] of [
    [child, '小鹿'],
    [sibling, '小熊'],
  ])
    await pool.query(
      'INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version) VALUES($1,$2,$3,$3,$4,1)',
      [id, family, name, await createChildPin(pepper)(family, id!, pin)],
    );
  const secret = randomUUID(),
    admit = createAuthAdmission(pool, secret);
  const sessions = createSessionService({
    repository: createSessionRepository(pool),
    admit,
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  const parent = await sessions.login({ email, password }, 'parent-source');
  const repo = createChildAccessRepository(pool, secret);
  const access = createChildAccessService({
    repository: repo,
    sessions,
    admit,
    replacePin: createReplacementPin(pepper),
  });
  const childRepo = createChildSessionRepository(pool);
  const children = () =>
    createChildSessionService({
      repository: createChildSessionRepository(pool),
      admit: createAuthAdmission(pool, secret),
      material: createPinMaterial(pepper),
      verify: verifyParentPassword,
      dummyHash: 'unused',
    });
  const input = { childId: child, credentialVersion: 1, pin: nextPin };
  return { family, code, child, sibling, secret, parent, repo, access, childRepo, children, input };
}
it('atomically changes protected PIN and revokes every old session across instances, preserving siblings, family code and drafts', async () => {
  const a = await setup(),
    b = await setup();
  const login = { familyCode: a.code, nickname: '小鹿', pin };
  const one = await a.children().login(login, 'one'),
    two = await a.children().login(login, 'two');
  const sibling = await a.children().login({ ...login, nickname: '小熊' }, 'sibling');
  const other = await b.children().login({ ...login, familyCode: b.code }, 'other');
  await pool.query(
    "INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at) VALUES($1,'test-only',1,'{}',now()+interval '7 days')",
    [a.child],
  );
  await a.access.reset(a.parent.token, a.parent.view.csrfToken, a.input, 'parent-source');
  for (const token of [one.token, two.token])
    await expect(a.children().read(token)).rejects.toMatchObject({ statusCode: 401 });
  await expect(a.children().login(login, 'old-pin')).rejects.toMatchObject({ statusCode: 401 });
  expect((await a.children().login({ ...login, pin: nextPin }, 'new-pin')).view.nickname).toBe(
    '小鹿',
  );
  expect((await a.children().read(sibling.token)).nickname).toBe('小熊');
  expect((await b.children().read(other.token)).nickname).toBe('小鹿');
  expect((await pool.query('SELECT code FROM families WHERE id=$1', [a.family])).rows[0].code).toBe(
    a.code,
  );
  expect(
    (await pool.query('SELECT count(*)::int n FROM drafts WHERE child_id=$1', [a.child])).rows[0].n,
  ).toBe(1);
  const row = (
    await pool.query(
      'SELECT pin_hash,credential_version,pin_pepper_version FROM children WHERE id=$1',
      [a.child],
    )
  ).rows[0];
  expect(row).toMatchObject({ credential_version: 2, pin_pepper_version: 1 });
  expect(row.pin_hash).toContain('$argon2id$v=19$m=32768,t=3,p=1$');
  expect(row.pin_hash).not.toContain(nextPin);
});
it('limits child listing and reset to verified parents of the same family, never hashes foreign or stale inputs', async () => {
  const a = await setup(),
    b = await setup(),
    pending = await setup(false);
  expect((await a.access.list(a.parent.token, 'ip')).children.map((c) => c.id).sort()).toEqual(
    [a.child, a.sibling].sort(),
  );
  await expect(
    a.repo.reset(tokenHash(a.parent.token), { ...a.input, childId: b.child }, async () => {
      throw new Error('must not hash');
    }),
  ).rejects.toMatchObject({ statusCode: 404 });
  await expect(pending.access.list(pending.parent.token, 'ip')).rejects.toMatchObject({
    statusCode: 403,
  });
  await pool.query(
    "UPDATE parent_sessions SET password_verified_at=now()-interval '6 minutes' WHERE token_hash=$1",
    [tokenHash(a.parent.token)],
  );
  expect((await a.access.list(a.parent.token, 'ip')).reauthenticationRequired).toBe(true);
  await expect(
    a.repo.reset(tokenHash(a.parent.token), a.input, async () => {
      throw new Error('must not hash');
    }),
  ).rejects.toMatchObject({ statusCode: 403 });
});
it('serializes duplicate submissions and rejects stale replay without revoking a newly established session', async () => {
  const a = await setup();
  const hashPin = () => createChildPin(pepper)(a.family, a.child, nextPin);
  const results = await Promise.allSettled([
    a.repo.reset(tokenHash(a.parent.token), a.input, hashPin),
    createChildAccessRepository(pool, a.secret).reset(tokenHash(a.parent.token), a.input, hashPin),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((r) => r.status === 'rejected')).toMatchObject({
    reason: { statusCode: 409 },
  });
  const fresh = await a
    .children()
    .login({ familyCode: a.code, nickname: '小鹿', pin: nextPin }, 'new');
  await expect(
    a.repo.reset(tokenHash(a.parent.token), a.input, async () => {
      throw new Error('must not hash');
    }),
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(await a.childRepo.read(tokenHash(fresh.token))).toMatchObject({ nickname: '小鹿' });
  await a.repo.reset(
    tokenHash(a.parent.token),
    { ...a.input, credentialVersion: 2, pin: '739182' },
    () => createChildPin(pepper)(a.family, a.child, '739182'),
  );
  await expect(a.repo.reset(tokenHash(a.parent.token), a.input, hashPin)).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(
    (await pool.query('SELECT credential_version FROM children WHERE id=$1', [a.child])).rows[0]
      .credential_version,
  ).toBe(3);
});
it('rolls back PIN, versions and sessions if hashing fails', async () => {
  const a = await setup();
  const login = await a.children().login({ familyCode: a.code, nickname: '小鹿', pin }, 'one');
  await expect(
    a.repo.reset(tokenHash(a.parent.token), a.input, async () => {
      throw new Error('hash unavailable');
    }),
  ).rejects.toThrow('hash unavailable');
  expect(await a.childRepo.read(tokenHash(login.token))).toBeDefined();
  expect(
    (await pool.query('SELECT credential_version FROM children WHERE id=$1', [a.child])).rows[0]
      .credential_version,
  ).toBe(1);
});

it('rechecks recent parent authentication after waiting for the family lock', async () => {
  const a = await setup();
  const blocker = await pool.connect();
  const waitingPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'education26-wait',
    max: 2,
  });
  let result: Promise<unknown> | undefined;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM families WHERE id=$1 FOR UPDATE', [a.family]);
    await blocker.query(
      "UPDATE parent_sessions SET password_verified_at=clock_timestamp()-interval '5 minutes'+interval '300 milliseconds' WHERE token_hash=$1",
      [tokenHash(a.parent.token)],
    );
    result = createChildAccessRepository(waitingPool, a.secret)
      .reset(tokenHash(a.parent.token), a.input, async () => {
        throw new Error('must not hash');
      })
      .catch((e) => e);
    let blocked = false;
    for (let i = 0; i < 100; i++) {
      blocked = (
        await pool.query(
          "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='education26-wait' AND wait_event_type='Lock') blocked",
        )
      ).rows[0].blocked;
      if (blocked) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(true);
    await blocker.query('SELECT pg_sleep(0.35)');
    await blocker.query('COMMIT');
    expect(await result).toMatchObject({ statusCode: 403 });
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
    await result;
    await waitingPool.end();
  }
});

it('rechecks authentication at the write boundary if PIN hashing crosses the five-minute limit', async () => {
  const a = await setup();
  await pool.query(
    "UPDATE parent_sessions SET password_verified_at=clock_timestamp()-interval '5 minutes'+interval '300 milliseconds' WHERE token_hash=$1",
    [tokenHash(a.parent.token)],
  );
  await expect(
    a.repo.reset(tokenHash(a.parent.token), a.input, async () => {
      await pool.query('SELECT pg_sleep(0.35)');
      return 'unused-hash';
    }),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(
    (await pool.query('SELECT credential_version FROM children WHERE id=$1', [a.child])).rows[0]
      .credential_version,
  ).toBe(1);
});

it('rejects a reused PIN without changing the account or ending an existing session', async () => {
  const a = await setup();
  const previous = await a.children().login({ familyCode: a.code, nickname: '小鹿', pin }, 'child');
  await expect(
    a.access.reset(a.parent.token, a.parent.view.csrfToken, { ...a.input, pin }, 'parent-source'),
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(await a.childRepo.read(tokenHash(previous.token))).toBeDefined();
});
it('allows independently admitted parent recovery from child login lockout, clearing only that child identity budget', async () => {
  const a = await setup();
  for (let i = 0; i < 5; i++)
    await expect(
      a.children().login({ familyCode: a.code, nickname: '小鹿', pin: nextPin }, `attempt-${i}`),
    ).rejects.toMatchObject({ statusCode: 401 });
  await expect(
    a.children().login({ familyCode: a.code, nickname: '小鹿', pin }, 'blocked'),
  ).rejects.toMatchObject({ statusCode: 429 });
  const bucket = (value: string) => createHmac('sha256', a.secret).update(value).digest('hex');
  const before = (
    await pool.query('SELECT count(*)::int n FROM registration_attempts WHERE bucket=$1', [
      bucket('authentication'),
    ])
  ).rows[0].n;
  await a.access.reset(a.parent.token, a.parent.view.csrfToken, a.input, 'parent-source');
  expect(
    (
      await pool.query('SELECT count(*)::int n FROM registration_attempts WHERE bucket=$1', [
        bucket('authentication'),
      ])
    ).rows[0].n,
  ).toBe(before);
  expect(
    (await a.children().login({ familyCode: a.code, nickname: '小鹿', pin: nextPin }, 'restored'))
      .view.role,
  ).toBe('child');
});
it('rejects credentials verified before reset when trying to issue after the transaction commits', async () => {
  const a = await setup();
  const previous = (await a.childRepo.find(a.code, '小鹿'))!;
  await a.access.reset(a.parent.token, a.parent.view.csrfToken, a.input, 'parent-source');
  expect(await a.childRepo.issue(previous, tokenHash(randomUUID()))).toBe(false);
});

it('blocks simultaneous old-session reads and issuance behind reset and rejects both after it commits', async () => {
  const a = await setup();
  const old = await a.children().login({ familyCode: a.code, nickname: '小鹿', pin }, 'child');
  const account = (await a.childRepo.find(a.code, '小鹿'))!;
  const hash = await createChildPin(pepper)(a.family, a.child, nextPin);
  const waiting = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'education26-login-wait',
    max: 2,
  });
  const other = createChildSessionRepository(waiting);
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const resetting = a.repo.reset(tokenHash(a.parent.token), a.input, async () => {
    entered();
    await gate;
    return hash;
  });
  let issuing: Promise<boolean> | undefined, reading: ReturnType<typeof other.read> | undefined;
  try {
    await ready;
    issuing = other.issue(account, tokenHash(randomUUID()));
    reading = other.read(tokenHash(old.token));
    let blocked = 0;
    for (let i = 0; i < 100; i++) {
      blocked = (
        await pool.query(
          "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name='education26-login-wait' AND wait_event_type='Lock'",
        )
      ).rows[0].n;
      if (blocked === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(2);
    release();
    await resetting;
    expect(await issuing).toBe(false);
    expect(await reading).toBeUndefined();
  } finally {
    release();
    await resetting;
    await issuing;
    await reading;
    await waiting.end();
  }
});
it('enforces route origin, JSON, CSRF, strict schemas, no-cache and child/parent role isolation against the real repository', async () => {
  const a = await setup();
  const app = buildApp({ origin: headers.origin, childAccess: a.access });
  const cookie = `__Host-education_session=${a.parent.token}`;
  const attempt = async (payload: object, extra: Record<string, string> = {}) =>
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/parents/children/reset-pin',
        headers: { ...headers, cookie, ...extra },
        payload,
      })
    ).statusCode;
  try {
    const listing = await app.inject({ url: '/api/v1/parents/children', headers: { cookie } });
    expect(listing.statusCode).toBe(200);
    expect(listing.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(listing.json())).not.toContain('pinHash');
    for (const body of [
      { ...a.input, familyId: a.family },
      { ...a.input, credentialVersion: '1' },
      { ...a.input, pin: '123' },
    ])
      expect(await attempt(body)).toBe(400);
    for (const origin of ['', 'null', 'https://evil.example'])
      expect(await attempt(a.input, { origin })).toBe(403);
    expect(await attempt(a.input)).toBe(403);
    expect(await attempt(a.input, { 'x-education-request': '' })).toBe(403);
    expect(
      (await app.inject({ url: '/api/v1/parents/children?familyId=other', headers: { cookie } }))
        .statusCode,
    ).toBe(400);
    const child = await a.children().login({ familyCode: a.code, nickname: '小鹿', pin }, 'child');
    const childCookie = `__Host-education_session=${child.token}`;
    expect(
      (await app.inject({ url: '/api/v1/parents/children', headers: { cookie: childCookie } }))
        .statusCode,
    ).toBe(401);
    expect(
      await attempt(a.input, { cookie: childCookie, 'x-csrf-token': child.view.csrfToken }),
    ).toBe(401);
    expect(await attempt(a.input, { 'x-csrf-token': a.parent.view.csrfToken })).toBe(204);
  } finally {
    await app.close();
  }
});
