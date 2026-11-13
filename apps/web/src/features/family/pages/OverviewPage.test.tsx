import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, type ChildShelfBook, type StudyDay } from '@education/contracts';
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
const today = '2026-11-12';
// The days of a block ending on `to`, with minutes on the days given.
const block = (to: string, minutes: Record<string, number> = {}): StudyDay[] =>
  Array.from({ length: 28 }, (_, place) => {
    const date = addDays(to, place - 27);
    return {
      date,
      seconds: (minutes[date] ?? 0) * 60,
      problems: { independent: 0, assisted: 0, open: 0 },
      ids: date === today ? [['fixture-one', 'independent']] : [],
    };
  });
const overview = {
  timeZone: 'Asia/Shanghai',
  today,
  children: [
    {
      id: mi,
      days: block(today, { [today]: 12, '2026-11-06': 30 }),
      earliest: '2026-09-01',
      review: [{ id: 'fixture-two', version: 1, title: '第二道', incorrect: 2 }],
    },
    { id: le, days: block(today), earliest: null, review: [] },
  ],
};
// Test fixtures only: these books never enter the problem list.
const book = (id: string, name: string, done: number, fields: Partial<ChildShelfBook> = {}) =>
  ({
    id,
    name,
    grade: '一年级',
    subject: '数学',
    cover: null,
    status: 'available',
    problems: 10,
    assigned: true,
    done,
    ...fields,
  }) satisfies ChildShelfBook;
const shelf = (books: ChildShelfBook[]) => ({
  total: books.length,
  grades: ['一年级'],
  subjects: ['数学'],
  books,
  hasMore: false,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Replies = Record<string, unknown>;

// Answers each request by its path; anything not listed fails as the server
// would when it is down. A reply that is a function is called for each
// request.
function stubFetch(replies: Replies) {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('/api/v1/', '').split('?')[0]!;
    const key = `${init?.method ?? 'GET'} ${path}`;
    if (key in replies) {
      const found = replies[key];
      const reply = typeof found === 'function' ? (found as () => unknown)() : found;
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
  'GET parents/overview': () => overview,
  [`GET parents/children/${mi}/books`]: () =>
    shelf([book('book-patterns', '找规律', 5), book('book-shapes', '认图形', 10)]),
  [`GET parents/children/${le}/books`]: () => shelf([book('book-songs', '儿歌', 3)]),
};

it("shows each child's last seven days from the family overview", async () => {
  const fetcher = stubFetch(family);
  renderFamilyPage();
  expect(await screen.findByRole('heading', { name: '总览' })).toBeVisible();
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  const mine = await screen.findByRole('region', { name: '小米' });
  expect(await within(mine).findByText('11月6日 – 今天')).toBeVisible();
  expect(mine).toHaveTextContent('已学 42 分钟');
  expect(mine).toHaveTextContent('1 道题：独立完成 1 道');
  const theirs = screen.getByRole('region', { name: '乐乐' });
  expect(theirs).toHaveTextContent('这几天没有学习');
  expect(within(theirs).getByRole('button', { name: '往前看一天' })).toBeDisabled();
  expect(screen.getByRole('link', { name: '邀请孩子' })).toHaveAttribute(
    'href',
    '/family/profile#registration-key-title',
  );
  const asked = fetcher.mock.calls.map(([url]) => url);
  expect(asked.filter((url) => url.includes('learning-summary'))).toEqual([]);
});

it('reads the record again when the first reading failed', async () => {
  let failing = true;
  stubFetch({
    ...family,
    'GET parents/overview': () => (failing ? Response.json({}, { status: 503 }) : overview),
  });
  renderFamilyPage();
  const mine = await screen.findByRole('region', { name: '小米' });
  expect(await within(mine).findByRole('alert')).toHaveTextContent('学习记录没有读出来');
  expect(screen.getByRole('region', { name: '值得再练' })).toHaveTextContent(
    '有的学习记录没有读出来',
  );
  failing = false;
  await userEvent.click(within(mine).getByRole('button', { name: '重试' }));
  expect(await within(mine).findByText('11月6日 – 今天')).toBeVisible();
});

it('picks a day for the figures and the record, and moves back reading earlier days ahead', async () => {
  const fetcher = stubFetch({
    ...family,
    [`GET parents/children/${mi}/days`]: () => ({ days: block('2026-10-15') }),
  });
  renderFamilyPage();
  const mine = await screen.findByRole('region', { name: '小米' });
  await userEvent.click(await within(mine).findByRole('button', { name: '11 月 12 日 12 分钟' }));
  expect(mine).toHaveTextContent('2026年11月12日已学 12 分钟');
  expect(within(mine).getByRole('link', { name: '看学习记录' })).toHaveAttribute(
    'href',
    `/family/learning?child=${mi}&from=2026-11-12&to=2026-11-12`,
  );
  const back = within(mine).getByRole('button', { name: '往前看一天' });
  for (let step = 0; step < 15; step++) await userEvent.click(back);
  expect(mine).toHaveTextContent('10月22日 – 10月28日已学 0 分钟');
  const asked = fetcher.mock.calls.map(([url]) => url);
  await vi.waitFor(() =>
    expect(asked.filter((url) => url.includes('/days?'))).toEqual([
      `/api/v1/parents/children/${mi}/days?to=2026-10-15`,
    ]),
  );
  await userEvent.click(within(mine).getByRole('button', { name: '往后看一天' }));
  expect(mine).toHaveTextContent('10月23日 – 10月29日');
});

it('shows a child the record leaves out as not read, and reads it again', async () => {
  let leftOut = true;
  stubFetch({
    ...family,
    'GET parents/overview': () =>
      leftOut
        ? { ...overview, children: overview.children.filter(({ id }) => id !== le) }
        : overview,
  });
  renderFamilyPage();
  const mine = await screen.findByRole('region', { name: '小米' });
  expect(await within(mine).findByText('11月6日 – 今天')).toBeVisible();
  const theirs = screen.getByRole('region', { name: '乐乐' });
  expect(within(theirs).getByRole('alert')).toHaveTextContent('学习记录没有读出来');
  leftOut = false;
  await userEvent.click(within(theirs).getByRole('button', { name: '重试' }));
  expect(await within(theirs).findByText('11月6日 – 今天')).toBeVisible();
});

it('lists problems worth another try without planning them one by one', async () => {
  stubFetch(family);
  renderFamilyPage();
  const ideas = await screen.findByRole('region', { name: '值得再练' });
  expect(await within(ideas).findByText('小米 · 答错 2 次')).toBeVisible();
  expect(within(ideas).queryByRole('button')).toBeNull();
});

it("lists the children's books in turn with their progress, and links to each child's books", async () => {
  stubFetch(family);
  renderFamilyPage();
  const given = await screen.findByRole('region', { name: '已安排' });
  await within(given).findByText('找规律');
  const rows = within(given)
    .getAllByRole('listitem')
    .map((row) => row.textContent);
  expect(rows).toEqual([
    '找规律小米 · 一年级数学5 / 10',
    '儿歌乐乐 · 一年级数学3 / 10',
    '认图形小米 · 一年级数学学完',
  ]);
  expect(within(given).getByRole('link', { name: '小米已安排 2 本' })).toHaveAttribute(
    'href',
    `/family/practice?child=${mi}&state=assigned`,
  );
  expect(within(given).getByRole('link', { name: '去书库挑书' })).toHaveAttribute(
    'href',
    '/family/practice',
  );
});

it('takes back an unavailable book from its row', async () => {
  let held = true;
  const fetcher = stubFetch({
    ...family,
    [`GET parents/children/${le}/books`]: () =>
      shelf(held ? [book('book-songs', '儿歌', 3, { status: 'unavailable' })] : []),
    [`DELETE parents/children/${le}/assignments/book-songs`]: () => {
      held = false;
      return new Response(null, { status: 204 });
    },
  });
  renderFamilyPage();
  const given = await screen.findByRole('region', { name: '已安排' });
  expect(await within(given).findByText('乐乐 · 暂时不可用')).toBeVisible();
  await userEvent.click(within(given).getByRole('button', { name: '取消给乐乐安排《儿歌》' }));
  await vi.waitFor(() => expect(within(given).queryByText('儿歌')).toBeNull());
  const taken = fetcher.mock.calls.find(([, init]) => init?.method === 'DELETE')!;
  expect(taken[1]!.body).toBe('{}');
  expect((taken[1]!.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf);
});

it('sends a family without books to the library', async () => {
  stubFetch({
    ...family,
    [`GET parents/children/${mi}/books`]: shelf([]),
    [`GET parents/children/${le}/books`]: shelf([]),
  });
  renderFamilyPage();
  const given = await screen.findByRole('region', { name: '已安排' });
  expect(await within(given).findByText('还没有安排书')).toBeVisible();
  await userEvent.click(within(given).getByRole('button', { name: '去书库挑书' }));
  expect(await screen.findByRole('heading', { name: '练习安排', level: 1 })).toBeVisible();
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
    '/family/privacy#family-deletion-title',
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
