import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { compose, database } from '../../scripts/accounts-compose.mjs';

const origin = `https://localhost:${process.env.ACCOUNTS_PORT_A ?? '8443'}`;
const other = `https://localhost:${process.env.ACCOUNTS_PORT_B ?? '8444'}`;
const password = 'a private isolated account testing phrase';
const headers = { Origin: origin, 'X-Education-Request': 'session' };
const registrationHeaders = { ...headers, 'X-Education-Request': 'registration' };

test.describe.configure({ mode: 'serial' });

test('failed migrations block startup and readiness; controlled migration is repeatable', async ({
  request,
}) => {
  await compose(['up', '-d', '--wait', 'db']);
  await database('CREATE TABLE families (block_migration boolean);');
  const failure = await compose(['up', '-d', 'app-a', 'app-b'], { allowFailure: true });
  expect(failure.code).not.toBe(0);
  expect((await compose(['ps', '--status', 'running', '--services'])).output.trim()).toBe('db');
  // Deliberately bypass dependencies only in this destructive test: health must still fail closed.
  await compose(['up', '-d', '--no-deps', 'app-a', 'app-b', 'gateway']);
  await expect
    .poll(async () => {
      try {
        return (await request.get('/health/live')).status();
      } catch {
        return 0;
      }
    })
    .toBe(200);
  for (const base of [origin, other]) {
    expect((await request.get(`${base}/health/ready`)).status()).toBe(503);
    const result = await request.post(`${base}/api/v1/parents/register`, {
      headers: registrationHeaders,
      data: { email: `blocked-${randomUUID()}@example.test`, password },
    });
    expect(result.status()).toBe(503);
    expect(await result.json()).toEqual({ message: '暂时无法完成，请稍后重试。' });
  }
  await database('DROP TABLE families;');
  await compose(['up', '-d', '--wait', '--wait-timeout', '90']);
  const applied = await database('SELECT count(*) FROM drizzle.__drizzle_migrations;');
  expect(Number(applied)).toBeGreaterThan(0);
  await compose(['run', '--rm', 'migrate']);
  await compose(['run', '--rm', 'migrate']);
  expect(await database('SELECT count(*) FROM drizzle.__drizzle_migrations;')).toBe(applied);
  for (const base of [origin, other])
    expect((await request.get(`${base}/health/ready`)).status()).toBe(200);
});

test('readiness checks the required migration and permits later additive migrations', async ({
  request,
}) => {
  const hash = await database(
    'SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1;',
  );
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  await database(
    `UPDATE drizzle.__drizzle_migrations SET hash='test-incomplete' WHERE hash='${hash}';`,
  );
  try {
    for (const base of [origin, other])
      expect((await request.get(`${base}/health/ready`)).status()).toBe(503);
  } finally {
    await database(
      `UPDATE drizzle.__drizzle_migrations SET hash='${hash}' WHERE hash='test-incomplete';`,
    );
  }
  await database(
    "INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('test-later-additive',9999999999999);",
  );
  try {
    for (const base of [origin, other])
      expect((await request.get(`${base}/health/ready`)).status()).toBe(200);
  } finally {
    await database("DELETE FROM drizzle.__drizzle_migrations WHERE hash='test-later-additive';");
  }
});

test('register on A, log in on B, refresh on A, rotate and revoke across instances', async ({
  page,
  context,
}) => {
  const email = `cross-instance-${randomUUID()}@example.test`;
  for (const base of [origin, other]) {
    const receipt = await context.request.post(`${base}/api/v1/parents/register`, {
      headers: registrationHeaders,
      data: { email, password },
    });
    expect(receipt.status()).toBe(202);
    expect(await receipt.json()).toEqual({ status: 'pending-verification', mail: 'not-sent' });
  }
  expect(await database(`SELECT count(*) FROM parents WHERE email='${email}';`)).toBe('1');
  const login = await context.request.post(`${other}/api/v1/parents/login`, {
    headers,
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).access).toBe('verification-only');
  const oldCookie = (await context.cookies()).find(
    (cookie) => cookie.name === '__Host-education_session',
  )!;
  expect(oldCookie).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
  await page.goto('/family');
  await expect(page.getByRole('heading', { name: '我的家长账号' })).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const rotated = await context.request.post(`${origin}/api/v1/parents/login`, {
    headers,
    data: { email, password },
  });
  expect(rotated.status()).toBe(200);
  const stale = await context.request.get(`${other}/api/v1/session`, {
    headers: { Cookie: `${oldCookie.name}=${oldCookie.value}` },
  });
  expect(stale.status()).toBe(401);
  // Reload obtains the new token's CSRF proof before the UI sends logout.
  await page.reload();
  await page.getByRole('button', { name: '退出账号' }).click();
  await expect(page.getByRole('heading', { name: '家长登录' })).toBeVisible();
  expect((await context.request.get(`${other}/api/v1/session`)).status()).toBe(401);
  expect(await database('SELECT count(*) FROM parent_sessions;')).toBe('0');
  const a = (await compose(['ps', '-q', 'app-a'])).output.trim();
  const b = (await compose(['ps', '-q', 'app-b'])).output.trim();
  expect(a).not.toBe(b);
});

test('alternating instances share the same email attempt budget', async ({ request }) => {
  const email = `limited-${randomUUID()}@example.test`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await request.post(`${attempt % 2 ? other : origin}/api/v1/parents/login`, {
      headers,
      data: { email, password },
    });
    expect(response.status()).toBe(401);
  }
  for (const base of [origin, other]) {
    const limited = await request.post(`${base}/api/v1/parents/login`, {
      headers,
      data: { email, password },
    });
    expect(limited.status()).toBe(429);
    expect(limited.headers()['retry-after']).toBe('60');
  }
});

test('database outage fails readiness and registration without losing form input; restart recovers', async ({
  page,
  request,
}, info) => {
  const email = `outage-${randomUUID()}@example.test`;
  await page.goto('/family');
  await page.getByLabel('家长邮箱').fill(email);
  await page.getByLabel('设置密码').fill(password);
  await expect(page.getByRole('button', { name: '提交注册' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('before-outage.png'), fullPage: true });
  await compose(['stop', '-t', '3', 'db']);
  try {
    for (const base of [origin, other]) {
      expect((await request.get(`${base}/health/live`)).status()).toBe(200);
      expect((await request.get(`${base}/health/ready`)).status()).toBe(503);
      expect((await request.get(`${base}/api/v1/session`)).status()).toBe(503);
    }
    await page.getByRole('button', { name: '提交注册' }).click();
    await expect(page.getByRole('alert')).toHaveText('暂时无法完成注册，请稍后重试。');
    await expect(page.getByLabel('家长邮箱')).toHaveValue(email);
    await expect(page.getByLabel('设置密码')).toHaveValue(password);
    await expect(page.getByRole('heading', { name: '注册申请已受理' })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('database-unavailable.png'), fullPage: true });
  } finally {
    await compose(['up', '-d', '--wait', 'db']);
  }
  for (const base of [origin, other]) {
    await expect.poll(async () => (await request.get(`${base}/health/ready`)).status()).toBe(200);
  }
  expect(await database(`SELECT count(*) FROM parents WHERE email='${email}';`)).toBe('0');
  await page.getByRole('button', { name: '提交注册' }).click();
  await expect(page.getByRole('heading', { name: '注册申请已受理' })).toBeVisible();
  expect(await database(`SELECT count(*) FROM parents WHERE email='${email}';`)).toBe('1');
});
