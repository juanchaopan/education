import { afterAll, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import { createRegistrationStore } from './postgres-registration.js';
import { createAuthAdmission } from './auth-admission.js';
import { createRegistrationService } from '../services/registration.js';
import { hashParentPassword } from '../services/password.js';

if (!process.env.DATABASE_URL) throw new Error('An isolated DATABASE_URL is required');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  connectionTimeoutMillis: 1000,
  statement_timeout: 3000,
});
const emails: string[] = [];
const save = createRegistrationStore(pool);
function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const email = () => {
  const value = `registration-${randomUUID()}@example.test`;
  emails.push(value);
  return value;
};
const familyCount = async () =>
  Number((await pool.query('SELECT count(*) FROM families')).rows[0].count);
afterAll(async () => {
  await pool.query(
    'DELETE FROM families WHERE id IN (SELECT family_id FROM parents WHERE email = ANY($1))',
    [emails],
  );
  await pool.end();
});

it('rolls back surplus families for sequential and concurrent duplicate requests', async () => {
  const address = email();
  const before = await familyCount();
  await Promise.all(Array.from({ length: 8 }, () => save(address, 'test-only-hash')));
  await save(address, 'replacement-must-not-overwrite');
  expect(await familyCount()).toBe(before + 1);
  const parents = await pool.query(
    'SELECT email_verified, password_hash FROM parents WHERE email=$1',
    [address],
  );
  expect(parents.rows).toEqual([{ email_verified: false, password_hash: 'test-only-hash' }]);
});

it('rolls back the family when the parent insert fails', async () => {
  const address = email();
  const before = await familyCount();
  await pool.query(`CREATE FUNCTION registration_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.password_hash = 'inject-database-failure' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$`);
  await pool.query(
    'CREATE TRIGGER registration_test_failure BEFORE INSERT ON parents FOR EACH ROW EXECUTE FUNCTION registration_test_failure()',
  );
  try {
    await expect(save(address, 'inject-database-failure')).rejects.toThrow();
    expect(await familyCount()).toBe(before);
    expect((await pool.query('SELECT id FROM parents WHERE email=$1', [address])).rowCount).toBe(0);
  } finally {
    await pool.query('DROP TRIGGER registration_test_failure ON parents');
    await pool.query('DROP FUNCTION registration_test_failure()');
  }
});

it('persists an unverified parent with a real hash and uniform receipts for duplicates', async () => {
  const address = email();
  const password = '  this family explores every small question  ';
  const submit = createRegistrationService({
    save,
    hash: hashParentPassword,
    admit: createAuthAdmission(pool, randomUUID()),
  });
  const first = await submit({ email: address.toUpperCase(), password }, '127.0.0.1');
  expect(await submit({ email: address, password }, '127.0.0.1')).toEqual(first);
  const parent = (await pool.query('SELECT * FROM parents WHERE email=$1', [address])).rows[0];
  expect(parent.email_verified).toBe(false);
  expect(parent.password_hash).not.toContain(password);
  expect(await verify(parent.password_hash, password)).toBe(true);
  expect(
    (await pool.query('SELECT id FROM registration_keys WHERE family_id=$1', [parent.family_id]))
      .rowCount,
  ).toBe(0);
});

it('shares per-email limits across service instances and stores only pseudonymous buckets', async () => {
  const secret = randomUUID();
  const first = createAuthAdmission(pool, secret);
  const second = createAuthAdmission(pool, secret);
  const address = email();
  for (let count = 0; count < 10; count++) await first(async () => {}, address, '127.0.0.1');
  await expect(second(async () => {}, address, '127.0.0.2')).rejects.toMatchObject({
    statusCode: 429,
  });
  const rows = await pool.query('SELECT bucket FROM registration_attempts');
  expect(rows.rows.every((row: { bucket: string }) => /^[a-f0-9]{64}$/.test(row.bucket))).toBe(
    true,
  );
});

it('aggregates equivalent IPv6 addresses to the same /64 source budget', async () => {
  const admit = createAuthAdmission(pool, randomUUID());
  for (let count = 0; count < 30; count++) await admit(async () => {}, email(), '2001:db8::1');
  await expect(admit(async () => {}, email(), '2001:0db8:0000:0000:1111::2')).rejects.toMatchObject(
    { statusCode: 429 },
  );
});

it('enforces global hash slots and releases a slot after a failing operation', async () => {
  const clients = await Promise.all(Array.from({ length: 4 }, () => pool.connect()));
  try {
    for (const [slot, client] of clients.entries())
      await client.query('SELECT pg_advisory_lock(1718,$1)', [slot]);
    const admit = createAuthAdmission(pool, randomUUID());
    await expect(admit(async () => {}, email(), 'ip')).rejects.toMatchObject({ statusCode: 429 });
  } finally {
    for (const client of clients) client.release(true);
  }
  const admit = createAuthAdmission(pool, randomUUID());
  await expect(
    admit(
      async () => {
        throw new Error('operation failed');
      },
      email(),
      'ip',
    ),
  ).rejects.toThrow();
  expect(await admit(async () => 'recovered', email(), 'ip')).toBe('recovered');
});

it('rejects excess local work without an unbounded hash queue', async () => {
  const admit = createAuthAdmission(pool, randomUUID());
  const release = signal();
  const started = [signal(), signal()];
  const work = started.map((signal) =>
    admit(
      async () => {
        signal.resolve();
        await release.promise;
      },
      email(),
      'ip',
    ),
  );
  try {
    await Promise.all(started.map((signal) => signal.promise));
    await expect(admit(async () => {}, email(), 'ip')).rejects.toMatchObject({ statusCode: 429 });
  } finally {
    release.resolve();
    await Promise.all(work);
  }
  expect(await admit(async () => 'ready', email(), 'ip')).toBe('ready');
});
