import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderFamilyPage } from '../../../test/family-page';

const csrf = 'a'.repeat(43);
const mi = '11111111-1111-4111-8111-111111111111';
const le = '22222222-2222-4222-8222-222222222222';
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: csrf,
};
const problem = (id: string, title: string, counts: object) => ({
  id,
  version: 1,
  title,
  independent: 0,
  assisted: 0,
  incorrect: 0,
  uncertain: 0,
  hints: 0,
  reviewSuggested: false,
  ...counts,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Replies = Record<string, unknown>;

// Answers each request by its path; anything not listed fails as the server
// would when it is down.
function stubFetch(replies: Replies) {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('/api/v1/', '').split('?')[0]!;
    const key = `${init?.method ?? 'GET'} ${path}`;
    if (key in replies) {
      const reply = replies[key];
      return reply instanceof Response ? reply : Response.json(reply);
    }
    return Response.json({}, { status: 503 });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const family: Replies = {
  'GET session': session,
  'GET parents/registration-keys': {
    key: null,
    reauthenticationRequired: false,
    familyCode: 'ABCD-EFGH-JKMN',
  },
  'GET parents/children': {
    reauthenticationRequired: false,
    children: [
      { id: mi, nickname: '小米', credentialVersion: 1 },
      { id: le, nickname: '乐乐', credentialVersion: 1 },
    ],
  },
  [`GET parents/children/${mi}/learning-summary`]: {
    childId: mi,
    hasMore: false,
    problems: [
      problem('fixture-one', '第一道', { independent: 2, assisted: 1 }),
      problem('fixture-two', '第二道', { incorrect: 2, reviewSuggested: true }),
    ],
  },
  [`GET parents/children/${le}/learning-summary`]: { childId: le, hasMore: false, problems: [] },
  [`GET parents/children/${mi}/practice`]: { hasMore: false, problems: [] },
  [`GET parents/children/${le}/practice`]: {
    hasMore: false,
    problems: [{ id: 'fixture-three', version: 1, title: '第三道' }],
  },
};

it('shows each child with totals from their record, never mixing hints into finishing alone', async () => {
  stubFetch(family);
  renderFamilyPage();
  expect(await screen.findByRole('heading', { name: '总览' })).toBeVisible();
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  const mine = await screen.findByRole('region', { name: '小米' });
  expect(await within(mine).findByText('次独立完成')).toBeVisible();
  const tiles = within(mine)
    .getAllByRole('definition')
    .map((tile) => tile.textContent);
  expect(tiles).toEqual(['2', '2', '1']);
  const theirs = screen.getByRole('region', { name: '乐乐' });
  expect(await within(theirs).findByText('还没有学习记录。')).toBeVisible();
  const planned = screen.getByRole('region', { name: '已安排' });
  expect(await within(planned).findByText('第三道')).toBeVisible();
  expect(screen.getByRole('link', { name: '邀请孩子' })).toHaveAttribute(
    'href',
    '/family/children#invite',
  );
});

it('plans a problem worth another try for the child who needs it', async () => {
  const fetcher = stubFetch({
    ...family,
    [`POST parents/children/${mi}/practice`]: new Response(null, { status: 204 }),
  });
  renderFamilyPage();
  const ideas = await screen.findByRole('region', { name: '值得再练' });
  expect(await within(ideas).findByText('小米 · 答错 2 次')).toBeVisible();
  await userEvent.click(within(ideas).getByRole('button', { name: '为小米安排“第二道”' }));
  expect(await within(ideas).findByText('已安排')).toBeVisible();
  const assigned = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!;
  expect(JSON.parse(String(assigned[1]!.body))).toEqual({ id: 'fixture-two', version: 1 });
  expect((assigned[1]!.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf);
});

it('invites a family without children to add one, and still offers its settings', async () => {
  stubFetch({
    ...family,
    'GET parents/children': { reauthenticationRequired: false, children: [] },
  });
  renderFamilyPage();
  expect(await screen.findByRole('heading', { name: '还没有孩子' })).toBeVisible();
  expect(screen.getByRole('link', { name: '删除家庭' })).toHaveAttribute(
    'href',
    '/family/privacy#family-deletion',
  );
});

it('lets the parent move between the parts of the space and sign out', async () => {
  stubFetch({ ...family, 'POST parents/logout': new Response(null, { status: 204 }) });
  renderFamilyPage();
  const places = await screen.findByRole('navigation', { name: '家长空间' });
  expect(within(places).getByRole('link', { name: '总览' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await userEvent.click(within(places).getByRole('link', { name: '学习记录' }));
  expect(await screen.findByRole('heading', { name: '学习记录', level: 1 })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '退出账号' }));
  expect(await screen.findByRole('heading', { name: '家长登录' })).toBeVisible();
});
