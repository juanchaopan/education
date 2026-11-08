import { expect, test, type Browser, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import type { CatalogResponse } from '@education/contracts';
import { familyDeletionPhrase } from '../libs/contracts/src/family-deletion.js';
import {
  seedPasswordParent,
  signInWithPassword,
  submitParentLogin,
  type PasswordParent,
} from './password-parent.js';

// The family framework as two families use it: real parent sign-in, a real
// KEY, a child who joins and signs in, the catalog of maintained problems,
// data controls and family isolation, against the production entry point with
// no AI key configured. Both children use the same nickname, which only the
// family code tells apart.

// Every signed-out page load and every sign-in counts against the address's
// sign-in budget of its server, and one run uses most of the fifteen-minute
// allowance. A retry inside that window would be refused for the budget alone.
test.describe.configure({ retries: 0 });

const nickname = '小鹿';
const unavailableAi = '暂未启用：现在不会发送任何内容，孩子用题目提示继续。';
const published = '一年级 · 数学 · 一棵青菜有多重';

type ChildLogin = { code: string; pin: string };
type Request = { method: 'GET' | 'POST'; path: string; data?: object };

// Fills the child login form already on the page. The family code and
// nickname are remembered on the device, and filled again all the same.
async function submitChildLogin(page: Page, { code, pin }: ChildLogin) {
  await page.getByLabel('我的家庭码', { exact: true }).fill(code);
  await page.getByLabel('我的昵称', { exact: true }).fill(nickname);
  await page.getByLabel('我的六位 PIN').fill(pin);
  await page.getByRole('button', { name: '进入我的空间' }).click();
}

const welcome = (page: Page) => page.getByRole('heading', { name: `${nickname}，欢迎回来！` });
const childLogin = (page: Page) => page.getByRole('heading', { name: '孩子登录', exact: true });
const resetPin = (page: Page) => page.getByRole('button', { name: `为${nickname}重置 PIN` });

// Reloads a child's page that should have lost its session and signs in again.
async function signInAgain(page: Page, login: ChildLogin) {
  await page.reload();
  await expect(childLogin(page)).toBeVisible();
  await submitChildLogin(page, login);
}

// The parent page invents no learning: the child has no records or practice,
// and only maintained problems can be arranged.
async function expectNothingRecorded(parent: Page) {
  const summary = parent.getByRole('region', { name: '学习摘要' });
  await summary.getByLabel('选择孩子').selectOption({ label: nickname });
  await expect(summary.getByText('还没有这位孩子的学习记录。')).toBeVisible();
  const practice = parent.getByRole('region', { name: '安排练习' });
  await practice.getByLabel('为哪位孩子安排').selectOption({ label: nickname });
  await expect(practice.getByLabel('选择已发布的题目').getByRole('option')).toHaveText([
    '请选择题目',
    published,
  ]);
  await expect(practice.getByText('还没有给这位孩子安排练习。')).toBeVisible();
}

// The parent hands out a KEY, the child joins with it in a browser of their
// own and signs in.
async function joinChild(browser: Browser, pool: pg.Pool, family: PasswordParent, pin: string) {
  const parent = await browser.newPage();
  await signInWithPassword(parent, family);
  await expect(parent.getByText(/还没有关联的孩子/)).toBeVisible();
  await parent.getByRole('button', { name: '生成注册 KEY', exact: true }).click();
  const key = await parent.getByLabel('本次生成的注册 KEY').textContent();

  const child = await browser.newPage();
  await child.goto(new URL('/join', parent.url()).href);
  await child.getByLabel('家长给我的 KEY').fill(key!);
  await child.getByLabel('我的昵称').fill(nickname);
  await child.getByLabel('设置六位数字 PIN').fill(pin);
  await child.getByRole('button', { name: '加入家庭', exact: true }).click();
  await expect(child.getByRole('heading', { name: '你已加入家庭！' })).toBeVisible();
  const code = (await child.getByLabel('我的家庭码').textContent())!;
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM children WHERE family_id=$1', [
    family.family,
  ]);

  await child.goto('/child');
  await submitChildLogin(child, { code, pin });
  await expect(welcome(child)).toBeVisible();
  await expect(child.getByText('家长还没有给你安排练习。')).toBeVisible();
  await parent.reload();
  await expectNothingRecorded(parent);
  return { parent, child, code, childId: rows[0]!.id };
}

// Requests from the signed-in page itself, with its session's CSRF token.
async function sessionRequests(page: Page) {
  const session = await page.request.get('/api/v1/session');
  const { csrfToken } = (await session.json()) as { csrfToken: string };
  const headers = {
    origin: new URL(page.url()).origin,
    'x-education-request': 'session',
    'x-csrf-token': csrfToken,
  };
  return async ({ method, path, data }: Request) => {
    const response = await page.request.fetch(path, { method, data, headers });
    return { status: response.status(), body: await response.text() };
  };
}

type Ask = Awaited<ReturnType<typeof sessionRequests>>;

// Another family's child is not found, exactly like a child who does not
// exist. Each request is otherwise valid, so only the ownership check can
// answer 404.
async function expectNotFound(ask: Ask, child: string, request: (child: string) => Request) {
  const foreign = await ask(request(child));
  expect(foreign.status).toBe(404);
  expect(foreign).toEqual(await ask(request(randomUUID())));
}

test('two families use the framework and stay apart through reset, sign-in again and deletion', async ({
  browser,
}, info) => {
  test.skip(
    !process.env.DATABASE_URL || !process.env.DELETION_LEDGER_URL,
    'Isolated application and deletion ledger databases required',
  );
  test.setTimeout(180_000);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const ledger = new pg.Pool({ connectionString: process.env.DELETION_LEDGER_URL });
  const families: string[] = [];
  const seed = async () => {
    const parent = await seedPasswordParent(pool);
    families.push(parent.family);
    return parent;
  };
  try {
    const first = await seed();
    const second = await seed();
    const a = await joinChild(browser, pool, first, '018274');
    const b = await joinChild(browser, pool, second, '640193');

    // The catalog holds only maintained problems, with no demonstrations.
    const explore = await browser.newPage();
    await explore.goto(new URL('/', a.parent.url()).href);
    await expect(explore.getByRole('list', { name: '题目顺序' }).getByRole('link')).toHaveText([
      '一棵青菜有多重',
    ]);
    const catalog = (await (
      await explore.request.get('/api/v1/problems')
    ).json()) as CatalogResponse;
    expect(catalog.problems.map(({ id }) => id)).toEqual(['garden-balance']);

    // Paid AI is switched on by default, but with no key nothing can be sent,
    // and the parent is told so whatever they consent to.
    const consent = a.parent.getByRole('region', { name: '外部 AI 授权' });
    for (const service of ['AI 解题提示', '语音转写'])
      await expect(
        consent.getByRole('group', { name: service }).getByText(unavailableAi),
      ).toBeVisible();
    await consent.screenshot({ path: info.outputPath('ai-unavailable.png') });

    // Each family sees only its own child, and another family's child is not
    // found. The parent signed in moments ago, so a PIN reset needs no new
    // password confirmation.
    const ask = await sessionRequests(a.parent);
    const listed = await ask({ method: 'GET', path: '/api/v1/parents/children' });
    const { children } = JSON.parse(listed.body) as { children: { id: string }[] };
    expect(children.map(({ id }) => id)).toEqual([a.childId]);
    const childPath = (child: string, resource: string) =>
      `/api/v1/parents/children/${child}/${resource}`;
    await expectNotFound(ask, b.childId, (child) => ({
      method: 'GET',
      path: childPath(child, 'learning-summary'),
    }));
    await expectNotFound(ask, b.childId, (child) => ({
      method: 'GET',
      path: childPath(child, 'practice'),
    }));
    await expectNotFound(ask, b.childId, (child) => ({
      method: 'POST',
      path: childPath(child, 'practice'),
      data: { id: 'garden-balance', version: 1 },
    }));
    await expectNotFound(ask, b.childId, (child) => ({
      method: 'POST',
      path: '/api/v1/parents/children/reset-pin',
      data: { childId: child, credentialVersion: 1, pin: '274918' },
    }));
    await b.child.reload();
    await expect(welcome(b.child)).toBeVisible();

    // A PIN reset signs the first child out; the old PIN stops working and the
    // new one works. The other family's child is untouched.
    const nextPin = '937261';
    await resetPin(a.parent).click();
    await a.parent.getByLabel('新的六位 PIN', { exact: true }).fill(nextPin);
    await a.parent.getByLabel('再输入一次新 PIN').fill(nextPin);
    await a.parent.getByRole('button', { name: '确认重置并退出旧登录' }).click();
    await expect(a.parent.getByText(`已重置${nickname}的 PIN`, { exact: false })).toBeVisible();
    await signInAgain(a.child, { code: a.code, pin: '018274' });
    await expect(a.child.getByRole('alert')).toContainText('PIN 不正确');
    const firstLogin = { code: a.code, pin: nextPin };
    await submitChildLogin(a.child, firstLogin);
    await expect(welcome(a.child)).toBeVisible();
    await b.child.reload();
    await expect(welcome(b.child)).toBeVisible();

    // Signing out and in again keeps the account and its child.
    await b.parent.getByRole('button', { name: '退出账号' }).click();
    await expect(b.parent.getByRole('heading', { name: '家长登录' })).toBeVisible();
    await submitParentLogin(b.parent, second);
    await expect(resetPin(b.parent)).toBeVisible();
    await b.child.context().clearCookies();
    await signInAgain(b.child, { code: b.code, pin: '640193' });
    await expect(welcome(b.child)).toBeVisible();

    // The first family exports only its own data.
    const exporting = a.parent.getByRole('region', { name: '导出家庭数据' });
    await exporting.getByLabel('导出前输入家长密码').fill(first.password);
    const download = a.parent.waitForEvent('download');
    await exporting.getByRole('button', { name: '确认并下载' }).click();
    const text = await readFile((await (await download).path())!, 'utf8');
    const file = JSON.parse(text) as { parent: { email: string }; children: unknown[] };
    expect(file.parent.email).toBe(first.email);
    expect(file.children).toHaveLength(1);
    expect(text).not.toContain(second.email);
    expect(text).not.toContain(b.childId);

    // Deleting the first family ends its parent and child access at once and
    // leaves the second family as it was.
    const deletion = a.parent.getByRole('region', { name: '删除家庭' });
    await deletion.getByLabel('删除前输入家长密码').fill(first.password);
    await deletion.getByLabel(`输入“${familyDeletionPhrase}”确认`).fill(familyDeletionPhrase);
    await deletion.getByRole('button', { name: '永久删除家庭' }).click();
    const deleted = a.parent.getByRole('region', { name: '家庭已删除' });
    await expect(deleted).toBeVisible();
    await a.parent.screenshot({
      path: info.outputPath('first-family-deleted.png'),
      fullPage: true,
    });
    const remaining = await pool.query('SELECT 1 FROM families WHERE id=$1', [first.family]);
    expect(remaining.rowCount).toBe(0);
    const recorded = await ledger.query(
      'SELECT completed_at IS NOT NULL AS done FROM family_deletions WHERE family_id=$1',
      [first.family],
    );
    expect(recorded.rows).toEqual([{ done: true }]);
    await signInAgain(a.child, firstLogin);
    await expect(a.child.getByRole('alert')).toContainText('不正确');
    await deleted.getByRole('button', { name: '注册新的家庭' }).click();
    await a.parent.getByRole('button', { name: '已有账号？去登录' }).click();
    await submitParentLogin(a.parent, first);
    await expect(a.parent.getByRole('alert')).toContainText('邮箱或密码不正确');

    await b.parent.reload();
    await expect(resetPin(b.parent)).toBeVisible();
    await expectNothingRecorded(b.parent);
    await b.child.reload();
    await expect(welcome(b.child)).toBeVisible();
    await b.child.screenshot({ path: info.outputPath('second-child-after.png'), fullPage: true });
  } finally {
    await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
    await ledger.query('DELETE FROM family_deletions WHERE family_id=ANY($1::uuid[])', [families]);
    await Promise.all([pool.end(), ledger.end()]);
  }
});
