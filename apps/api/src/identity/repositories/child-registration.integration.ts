import { afterAll, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createChildRegistrationRepository } from './postgres-child-registration.js';
import { createChildRegistrationService } from '../services/child-registration.js';
import { createChildPin } from '../services/child-pin.js';
import { createAuthAdmission } from './auth-admission.js';
import { createRecoveryRepository } from './postgres-recovery.js';
import { generateRegistrationKey } from '../services/registration-key.js';
import { tokenHash } from '../services/session-security.js';

if (!process.env.DATABASE_URL) throw new Error('Isolated DATABASE_URL required');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  statement_timeout: 3000,
});
const families: string[] = [];
const repository = createChildRegistrationRepository(pool);
const hashPin = createChildPin('ab'.repeat(32));
const request = (key: string) => ({
  requestId: randomUUID(),
  key,
  nickname: '小明',
  pin: '018274',
});
function service() {
  const secret = randomBytes(32).toString('hex');
  return createChildRegistrationService({
    repository,
    hashPin,
    fingerprintKey: secret,
    admit: createAuthAdmission(pool, secret),
  });
}
async function fixture() {
  const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0]
    .id as string;
  families.push(family);
  const email = `child-key-${randomUUID()}@example.test`;
  await pool.query(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,true)',
    [family, email, 'test-only-parent-hash'],
  );
  const key = await newKey(family);
  return { family, email, key, submit: service() };
}
async function newKey(family: string) {
  const key = generateRegistrationKey();
  await pool.query(
    "INSERT INTO registration_keys(family_id,key_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [family, tokenHash(key.replaceAll('-', ''))],
  );
  return key;
}
const count = async (family: string) =>
  (await pool.query('SELECT count(*)::int n FROM children WHERE family_id=$1', [family])).rows[0].n;
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});
it('creates exactly one correctly linked child with peppered Argon2id and stable family code, replays only matching requests', async () => {
  const f = await fixture();
  const input = request(f.key);
  const result = await f.submit(input, 'ip');
  expect(result).toMatchObject({ status: 'registered', nickname: '小明' });
  expect(result.familyCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$/);
  expect(await f.submit(input, 'ip')).toEqual(result);
  const row = (await pool.query('SELECT * FROM children WHERE family_id=$1', [f.family])).rows[0];
  expect(row.pin_hash).toContain('$argon2id$v=19$m=32768,t=3,p=1$');
  expect(row.pin_pepper_version).toBe(1);
  expect(row.canonical_nickname).toBe('小明');
  const records = (
    await pool.query('SELECT * FROM child_registrations WHERE child_id=$1', [row.id])
  ).rows;
  for (const raw of [input.pin, input.key, input.requestId])
    expect(JSON.stringify(records)).not.toContain(raw);
  await expect(f.submit({ ...input, pin: '018275' }, 'ip')).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(await count(f.family)).toBe(1);
});
it('serializes identical retries across repository instances and never creates twice for different requests', async () => {
  const f = await fixture();
  const input = {
    requestHash: tokenHash(randomUUID()),
    fingerprint: tokenHash('same-content'),
    keyHash: tokenHash(f.key.replaceAll('-', '')),
    nickname: '测试',
    canonical: '测试',
  };
  const other = createChildRegistrationRepository(pool);
  const hash = (family: string, child: string) => hashPin(family, child, '018274');
  const both = await Promise.all([repository.redeem(input, hash), other.redeem(input, hash)]);
  expect(both[0]).toEqual(both[1]);
  await expect(
    other.redeem({ ...input, requestHash: tokenHash(randomUUID()) }, hash),
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(await count(f.family)).toBe(1);
});
it('allows cross-family same names, rejects NFKC/case duplicates inside the family without spending the key', async () => {
  const a = await fixture();
  const b = await fixture();
  await a.submit({ ...request(a.key), nickname: ' Ａbc ' }, 'ip');
  await b.submit({ ...request(b.key), nickname: 'abc' }, 'ip');
  const next = await newKey(a.family);
  const attempt = { ...request(next), nickname: 'aBC' };
  await expect(a.submit(attempt, 'ip')).rejects.toMatchObject({ statusCode: 409 });
  expect(
    (
      await pool.query('SELECT consumed_at FROM registration_keys WHERE key_hash=$1', [
        tokenHash(next.replaceAll('-', '')),
      ])
    ).rows[0].consumed_at,
  ).toBeNull();
  const done = await a.submit({ ...attempt, requestId: randomUUID(), nickname: '另外一个' }, 'ip');
  expect(done.familyCode).toBe(
    (await pool.query('SELECT code FROM families WHERE id=$1', [a.family])).rows[0].code
      .match(/.{4}/g)
      .join('-'),
  );
  expect(await count(a.family)).toBe(2);
  expect(await count(b.family)).toBe(1);
});
it('rolls back key consumption when hashing or persistence fails', async () => {
  const f = await fixture();
  const input = {
    requestHash: tokenHash(randomUUID()),
    fingerprint: 'synthetic',
    keyHash: tokenHash(f.key.replaceAll('-', '')),
    nickname: '测试',
    canonical: '测试',
  };
  await expect(
    repository.redeem(input, async () => {
      throw new Error('synthetic hash failure');
    }),
  ).rejects.toThrow('synthetic hash failure');
  expect(await count(f.family)).toBe(0);
  expect(
    (
      await pool.query('SELECT consumed_at FROM registration_keys WHERE key_hash=$1', [
        input.keyHash,
      ])
    ).rows[0].consumed_at,
  ).toBeNull();
  expect(
    (await pool.query('SELECT code FROM families WHERE id=$1', [f.family])).rows[0].code,
  ).toBeNull();
  await expect(f.submit(request(f.key), 'ip')).resolves.toHaveProperty('status', 'registered');
});
it('refuses revoked, expired and unknown keys without creating a child', async () => {
  for (const column of ['revoked_at', 'expires_at']) {
    const f = await fixture();
    await pool.query(`UPDATE registration_keys SET ${column}=now() WHERE family_id=$1`, [f.family]);
    await expect(f.submit(request(f.key), 'ip')).rejects.toMatchObject({ statusCode: 409 });
    expect(await count(f.family)).toBe(0);
  }
  await expect(service()(request(generateRegistrationKey()), 'ip')).rejects.toMatchObject({
    statusCode: 409,
  });
});
it('preserves family membership and serializes redemption against actual parent recovery', async () => {
  const f = await fixture();
  const token = tokenHash(randomUUID());
  const recovery = createRecoveryRepository(pool);
  await recovery.reserve(f.email, 'send', {
    id: randomUUID(),
    tokenHash: token,
    payload: 'fixture',
  });
  const results = await Promise.allSettled([
    f.submit(request(f.key), 'ip'),
    recovery.consume(token, 'replacement-parent-hash'),
  ]);
  expect(results[1]).toMatchObject({ status: 'fulfilled', value: true });
  expect(await count(f.family)).toBe(results[0]!.status === 'fulfilled' ? 1 : 0);
  if (results[0]!.status === 'rejected')
    expect(results[0]!.reason).toMatchObject({ statusCode: 409 });
  expect(
    (
      await pool.query(
        'SELECT id FROM registration_keys WHERE family_id=$1 AND consumed_at IS NULL',
        [f.family],
      )
    ).rowCount,
  ).toBe(0);
});
it('keeps the per-KEY five-attempt limit across independent admissions and source changes', async () => {
  const secret = randomBytes(32).toString('hex');
  const one = createAuthAdmission(pool, secret);
  const two = createAuthAdmission(pool, secret);
  const key = tokenHash(randomUUID());
  for (let n = 0; n < 5; n++) await one(async () => true, key, `ip-${n}`, 'child-registration');
  await expect(
    two(async () => true, key, 'new-source', 'child-registration'),
  ).rejects.toMatchObject({ statusCode: 429 });
});
it('limits random-key guessing by source independently of parent login and recovery quotas', async () => {
  const admit = createAuthAdmission(pool, randomBytes(32).toString('hex'));
  for (let n = 0; n < 10; n++)
    await admit(async () => true, tokenHash(randomUUID()), 'same-ip', 'child-registration');
  await expect(
    admit(async () => true, tokenHash(randomUUID()), 'same-ip', 'child-registration'),
  ).rejects.toMatchObject({ statusCode: 429 });
  await expect(admit(async () => true, 'parent@example.test', 'same-ip')).resolves.toBe(true);
});

it('allows only one winner when different registrations redeem the same KEY concurrently', async () => {
  const f = await fixture();
  const base = {
    requestHash: tokenHash(randomUUID()),
    fingerprint: 'one',
    keyHash: tokenHash(f.key.replaceAll('-', '')),
    nickname: '第一位',
    canonical: '第一位',
  };
  const hash = (family: string, child: string) => hashPin(family, child, '018274');
  const results = await Promise.allSettled([
    repository.redeem(base, hash),
    createChildRegistrationRepository(pool).redeem(
      {
        ...base,
        requestHash: tokenHash(randomUUID()),
        fingerprint: 'two',
        nickname: '第二位',
        canonical: '第二位',
      },
      hash,
    ),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toMatchObject([
    { reason: { statusCode: 409 } },
  ]);
  expect(await count(f.family)).toBe(1);
});
it('checks expiry after waiting for a family lock, not at the start of the transaction', async () => {
  const f = await fixture();
  const blocker = await pool.connect();
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM families WHERE id=$1 FOR UPDATE', [f.family]);
    const result = f.submit(request(f.key), 'ip').then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await expect
      .poll(
        async () =>
          (
            await pool.query<{ waiting: boolean }>(
              `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock'
        AND query='SELECT id FROM families WHERE id=$1 FOR UPDATE') AS waiting`,
            )
          ).rows[0]!.waiting,
        { timeout: 2000 },
      )
      .toBe(true);
    await blocker.query(
      'UPDATE registration_keys SET expires_at=clock_timestamp() WHERE family_id=$1',
      [f.family],
    );
    await blocker.query('COMMIT');
    expect(await result).toMatchObject({ error: { statusCode: 409 } });
    expect(await count(f.family)).toBe(0);
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
  }
});
