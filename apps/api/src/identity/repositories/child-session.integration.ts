import { afterAll, expect, it } from 'vitest';
import { randomUUID, createHmac } from 'node:crypto';
import pg from 'pg';
import { createChildSessionRepository } from './postgres-child-session.js';
import { createChildSessionService } from '../services/child-session.js';
import { createChildPin, createPinMaterial } from '../services/child-pin.js';
import { hashParentPassword, verifyParentPassword } from '../services/password.js';
import { tokenHash } from '../services/session-security.js';
import { createAuthAdmission } from './auth-admission.js';
import { createSessionRepository } from './postgres-session.js';
import { buildApp } from '../../app.js';
import { createSessionService } from '../services/session.js';
import { createRegistrationKeyService } from '../services/registration-key.js';
import { createRegistrationKeyRepository } from './postgres-registration-key.js';
import { createRecoveryRepository } from './postgres-recovery.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  statement_timeout: 3000,
});
const families: string[] = [];
const pepper = 'ab'.repeat(32);
const pin = '018274';
const headers = {
  origin: 'https://education.example',
  'content-type': 'application/json',
  'x-education-request': 'session',
};

const repository = createChildSessionRepository(pool);
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});
async function setup() {
  const family = randomUUID(),
    child = randomUUID();
  const code = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [family, code]);
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
    VALUES($1,$2,'小鹿','小鹿',$3,1)`,
    [child, family, await createChildPin(pepper)(family, child, pin)],
  );
  const secret = randomUUID();
  const dummyHash = await hashParentPassword('test-only-dummy');
  const serviceFor = () =>
    createChildSessionService({
      repository: createChildSessionRepository(pool),
      admit: createAuthAdmission(pool, secret),
      material: createPinMaterial(pepper),
      verify: verifyParentPassword,
      dummyHash,
    });
  return {
    family,
    child,
    secret,
    service: serviceFor(),
    other: serviceFor(),
    input: { familyCode: code, nickname: '小鹿', pin },
  };
}
it('isolates same-named children by family, persists hash-only sessions across instances, and revokes on logout', async () => {
  const a = await setup(),
    b = await setup();
  const result = await a.service.login(a.input, 'source');
  const row = (
    await pool.query('SELECT * FROM child_sessions WHERE token_hash=$1', [tokenHash(result.token)])
  ).rows[0];
  expect(row.child_id).toBe(a.child);
  expect(row.child_id).not.toBe(b.child);
  expect(JSON.stringify(row)).not.toContain(result.token);
  expect((await a.other.read(result.token)).role).toBe('child');
  await a.other.logout(result.token, result.view.csrfToken);
  await expect(a.service.read(result.token)).rejects.toMatchObject({ statusCode: 401 });
});
it('slides DB expiry after more than seven days and rejects expired, version, epoch and unsupported pepper credentials', async () => {
  const a = await setup();
  const result = await a.service.login(a.input, 'source');
  await pool.query(
    `UPDATE child_sessions SET created_at=now()-interval '90 days',last_seen_at=now()-interval '80 days',expires_at=now()+interval '100 days' WHERE token_hash=$1`,
    [tokenHash(result.token)],
  );
  await a.other.read(result.token);
  expect(
    (
      await pool.query(
        `SELECT expires_at>now()+interval '179 days' renewed FROM child_sessions WHERE token_hash=$1`,
        [tokenHash(result.token)],
      )
    ).rows[0].renewed,
  ).toBe(true);
  for (const change of [
    "expires_at=now()-interval '1 second'",
    "last_seen_at=now()-interval '181 days'",
    'credential_version=0',
    'family_epoch=0',
  ]) {
    await pool.query(
      `UPDATE child_sessions SET expires_at=now()+interval '180 days',last_seen_at=now(),credential_version=1,family_epoch=1 WHERE token_hash=$1`,
      [tokenHash(result.token)],
    );
    await pool.query(`UPDATE child_sessions SET ${change} WHERE token_hash=$1`, [
      tokenHash(result.token),
    ]);
    await expect(a.service.read(result.token)).rejects.toMatchObject({ statusCode: 401 });
  }
  await pool.query('UPDATE children SET pin_pepper_version=NULL WHERE id=$1', [a.child]);
  await expect(a.service.login(a.input, 'source')).rejects.toMatchObject({ statusCode: 401 });
});
it('atomically rejects a changed PIN, child credential version, family membership or recovery epoch after verification', async () => {
  const a = await setup();
  const original = (await repository.find(a.input.familyCode, a.input.nickname))!;
  for (const change of [
    'credential_version=credential_version+1',
    "pin_hash='changed'",
    'pin_pepper_version=2',
  ]) {
    await pool.query(`UPDATE children SET ${change} WHERE id=$1`, [a.child]);
    expect(await repository.issue(original, tokenHash(randomUUID()))).toBe(false);
    await pool.query(
      'UPDATE children SET credential_version=1,pin_hash=$1,pin_pepper_version=1 WHERE id=$2',
      [original.pinHash, a.child],
    );
  }
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [a.family]);
  expect(await repository.issue(original, tokenHash(randomUUID()))).toBe(false);
});
it('shares per-child budgets across instances and IPs, and groups nickname and family normalization', async () => {
  const a = await setup();
  for (let i = 0; i < 5; i++)
    await expect(
      a.service.login({ ...a.input, pin: '937261' }, `source-${i}`),
    ).rejects.toMatchObject({ statusCode: 401 });
  await expect(
    a.other.login({ ...a.input, nickname: ' 小鹿 ' }, 'another-source'),
  ).rejects.toMatchObject({ statusCode: 429 });
  const b = await setup();
  expect((await b.service.login(b.input, 'another-source')).view.role).toBe('child');
});
it('enforces the family budget even when attackers rotate nicknames, and retains only pseudonymous buckets', async () => {
  const a = await setup();
  const admit = createAuthAdmission(pool, a.secret);
  for (let i = 0; i < 50; i++)
    await admit(
      async () => {},
      JSON.stringify([a.input.familyCode, `name${i}`]),
      `source-${i}`,
      'child-login',
      a.input.familyCode,
    );
  await expect(a.other.login(a.input, 'fresh-source')).rejects.toMatchObject({ statusCode: 429 });
  const rows = (await pool.query('SELECT bucket FROM registration_attempts')).rows;
  expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.bucket))).toBe(true);
});
it('rotates between parent and child sessions without retaining the old browser authority', async () => {
  const a = await setup();
  const parent = (
    await pool.query(
      `INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,'test-hash',true) RETURNING email`,
      [a.family, `${randomUUID()}@example.test`],
    )
  ).rows[0];
  const parents = createSessionRepository(pool);
  const account = (await parents.find(parent.email))!;
  const previous = 'x'.repeat(43);
  await parents.issue(account, tokenHash(previous));
  const child = await a.service.login(a.input, 'source', previous);
  expect(await parents.read(tokenHash(previous))).toBeUndefined();
  await parents.issue(account, tokenHash('y'.repeat(43)), tokenHash(child.token));
  await expect(a.service.read(child.token)).rejects.toMatchObject({ statusCode: 401 });
});
it('never grants parent endpoints to child sessions and validates Origin, CSRF, cookie ambiguity and server selectors', async () => {
  const a = await setup();
  const app = buildApp({ origin: 'https://education.example', childSessions: a.service });
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/children/login',
      headers,
      payload: a.input,
    });
    expect(login.statusCode).toBe(200);
    const cookie = String(login.headers['set-cookie']).split(';')[0]!;
    expect(login.headers['set-cookie']).toContain('Max-Age=15552000');
    const own = await app.inject({ url: '/api/v1/children/session', headers: { cookie } });
    expect(own.json()).toEqual({ role: 'child', nickname: '小鹿', csrfToken: expect.any(String) });
    expect(own.headers['set-cookie']).toContain('Max-Age=15552000');
    expect(own.headers['cache-control']).toBe('no-store');
    expect(
      (await app.inject({ url: '/api/v1/children/session?familyId=other', headers: { cookie } }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          url: '/api/v1/children/session',
          headers: { cookie: `${cookie}; ${cookie}` },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/children/logout',
          headers: { ...headers, cookie, 'x-csrf-token': 'wrong' },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/children/logout',
          headers: { ...headers, cookie, 'x-csrf-token': own.json().csrfToken },
          payload: {},
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ url: '/api/v1/children/session', headers: { cookie } })).statusCode,
    ).toBe(401);
  } finally {
    await app.close();
  }
});

it('rejects child cookies at the live parent session, KEY-read and KEY-write authorization boundaries', async () => {
  const a = await setup();
  const sessions = createSessionService({
    repository: createSessionRepository(pool),
    admit: createAuthAdmission(pool, randomUUID()),
    verify: verifyParentPassword,
    dummyHash: 'unused',
  });
  const keys = createRegistrationKeyService({
    sessions,
    repository: createRegistrationKeyRepository(pool),
  });
  const app = buildApp({ origin: headers.origin, sessions, registrationKeys: keys });
  try {
    const child = await a.service.login(a.input, 'source');
    const cookie = `__Host-education_session=${child.token}`;
    for (const url of ['/api/v1/session', '/api/v1/parents/registration-keys'])
      expect((await app.inject({ url, headers: { cookie } })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/parents/registration-keys',
          headers: { ...headers, cookie, 'x-csrf-token': child.view.csrfToken },
          payload: {},
        })
      ).statusCode,
    ).toBe(401);
    expect((await a.service.read(child.token)).role).toBe('child');
  } finally {
    await app.close();
  }
});

it('parent password recovery revokes only that family’s child sessions and blocks stale in-flight login', async () => {
  const a = await setup(),
    b = await setup();
  const own = await a.service.login(a.input, 'source'),
    other = await b.service.login(b.input, 'source');
  const original = (await repository.find(a.input.familyCode, a.input.nickname))!;
  const parent = (
    await pool.query(
      `INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,'old-hash',true) RETURNING id`,
      [a.family, `${randomUUID()}@example.test`],
    )
  ).rows[0];
  const reset = tokenHash(randomUUID());
  await pool.query(
    `INSERT INTO password_resets(parent_id,id,token_hash,status,expires_at) VALUES($1,$2,$3,'accepted',now()+interval '30 minutes')`,
    [parent.id, randomUUID(), reset],
  );
  expect(await createRecoveryRepository(pool).consume(reset, 'new-hash')).toBe(true);
  await expect(a.other.read(own.token)).rejects.toMatchObject({ statusCode: 401 });
  expect((await b.other.read(other.token)).nickname).toBe('小鹿');
  expect(await repository.issue(original, tokenHash(randomUUID()))).toBe(false);
  expect((await a.service.login(a.input, 'source')).view.role).toBe('child');
});

it('rechecks the current epoch after waiting for a concurrent family revocation lock', async () => {
  const a = await setup(),
    application = randomUUID();
  const active = await a.service.login(a.input, 'source');
  const original = (await repository.find(a.input.familyCode, a.input.nickname))!;
  const racingPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    application_name: application,
  });
  const racing = createChildSessionRepository(racingPool);
  const locker = await pool.connect();
  await locker.query('BEGIN');
  await locker.query('SELECT id FROM families WHERE id=$1 FOR UPDATE', [a.family]);
  const issue = racing.issue(original, tokenHash(randomUUID()));
  const read = racing.read(tokenHash(active.token));
  try {
    await expect
      .poll(async () =>
        Number(
          (
            await pool.query(
              `SELECT count(*) n FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'`,
              [application],
            )
          ).rows[0].n,
        ),
      )
      .toBe(2);
    await locker.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [a.family]);
    await locker.query('COMMIT');
    expect(await issue).toBe(false);
    expect(await read).toBeUndefined();
  } finally {
    await locker.query('ROLLBACK');
    locker.release();
    await Promise.allSettled([issue, read]);
    await racingPool.end();
  }
});

it('enforces daily child and family ceilings and the deployment budget shared with parent authentication', async () => {
  const a = await setup();
  const bucket = (value: string) => createHmac('sha256', a.secret).update(value).digest('hex');
  const identity = JSON.stringify([a.input.familyCode, a.input.nickname]);
  const cases = [
    { key: `child:${identity}`, count: 20, age: '1 hour' },
    { key: `family:${a.input.familyCode}`, count: 200, age: '1 hour' },
    { key: 'authentication', count: 100, age: '1 minute' },
  ];
  for (const item of cases) {
    const key = bucket(item.key);
    try {
      await pool.query(
        `INSERT INTO registration_attempts(bucket,attempted_at) SELECT $1,now()-$2::interval FROM generate_series(1,$3)`,
        [key, item.age, item.count],
      );
      await expect(a.other.login(a.input, 'fresh-source')).rejects.toMatchObject({
        statusCode: 429,
      });
      if (item.key === 'authentication')
        await expect(
          createAuthAdmission(pool, a.secret)(async () => {}, 'new-parent', 'other-source'),
        ).rejects.toMatchObject({ statusCode: 429 });
    } finally {
      await pool.query('DELETE FROM registration_attempts WHERE bucket=$1', [key]);
    }
  }
});
it('reads the session and logs out without spending login attempts, so the child still signs in', async () => {
  const a = await setup();
  const app = buildApp({ origin: headers.origin, childSessions: a.service });
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
        const read = await app.inject({ url: '/api/v1/children/session', headers: cookie });
        expect(read.statusCode).toBe(401);
        const logout = await app.inject({
          method: 'POST',
          url: '/api/v1/children/logout',
          headers: { ...headers, ...cookie, 'x-csrf-token': 'x'.repeat(43) },
          payload: {},
        });
        expect(logout.statusCode).toBe(401);
      }
    expect(await attempts()).toBe(before);
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/children/login',
      headers,
      payload: a.input,
    });
    expect(login.statusCode).toBe(200);
  } finally {
    await app.close();
  }
});
