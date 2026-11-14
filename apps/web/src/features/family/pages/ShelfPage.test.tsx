import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChildShelfBook, FamilyShelfBook } from '@education/contracts';
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
const family = (children: { id: string; nickname: string }[]) => ({
  reauthenticationRequired: false,
  children: children.map((child) => ({ ...child, credentialVersion: 1 })),
});
const twoChildren = family([
  { id: mi, nickname: '小米' },
  { id: le, nickname: '乐乐' },
]);

// Test fixtures only: these books never enter the problem list.
const fields = {
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available' as const,
  problems: 12,
};
const familyBook = (id: string, name: string, given: Record<string, number> = {}) =>
  ({
    ...fields,
    id,
    name,
    children: [mi, le].map((childId) => ({
      childId,
      assigned: childId in given,
      done: given[childId] ?? 0,
    })),
  }) satisfies FamilyShelfBook;
const childBook = (id: string, name: string, assigned: boolean, done = 0) =>
  ({ ...fields, id, name, assigned, done }) satisfies ChildShelfBook;
const page = <Book,>(books: Book[], total = books.length, hasMore = false) => ({
  total,
  grades: ['一年级', '二年级'],
  subjects: ['数学', '语文'],
  books,
  hasMore,
});

type Reply = unknown | ((url: URL, init?: RequestInit) => unknown);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Answers each request by its method and path; a reply may look at the whole
// address. Anything not listed fails as a server that is down would.
function stubFetch(replies: Record<string, Reply>) {
  const fetcher = vi.fn(async (address: string, init?: RequestInit) => {
    const url = new URL(address, 'https://education.example');
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace('/api/v1/', '')}`;
    if (!(key in replies)) return Response.json({}, { status: 503 });
    const reply = replies[key];
    const answer: unknown = await (typeof reply === 'function' ? reply(url, init) : reply);
    return answer instanceof Response ? answer : Response.json(answer);
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const requests = (fetcher: ReturnType<typeof stubFetch>, method: string) =>
  fetcher.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method);

it('gives a library book to a child from the list of children, then moves it to the family shelf', async () => {
  let given = false;
  const fetcher = stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': (url: URL) =>
      url.searchParams.get('shelf') === 'library'
        ? page(given ? [] : [familyBook('book-patterns', '找规律')])
        : page(given ? [familyBook('book-patterns', '找规律', { [mi]: 0 })] : []),
    [`PUT parents/children/${mi}/assignments/book-patterns`]: () => {
      given = true;
      return new Response(null, { status: 204 });
    },
  });
  const user = userEvent.setup();
  renderFamilyPage('/family/practice');
  expect(await screen.findByRole('heading', { name: '找规律' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '书库' })).toBeChecked();
  expect(screen.getByText('1', { selector: 'b' }).parentElement).toHaveTextContent('共1本');

  await user.click(screen.getByRole('button', { name: '安排《找规律》' }));
  const list = screen.getByRole('dialog', { name: '安排《找规律》' });
  const forMi = within(list).getByRole('button', { name: '为小米安排《找规律》' });
  expect(forMi).toHaveFocus();
  await user.click(forMi);
  await waitFor(() =>
    expect(within(list).getByRole('button', { name: /^为小米.*《找规律》$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    ),
  );
  const [, put] = requests(fetcher, 'PUT')[0]!;
  expect(put?.body).toBe('{}');
  expect(screen.getByRole('dialog')).toBeVisible();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await screen.findByText('书库里的书都安排出去了')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '看我的家庭' }));
  expect(await screen.findByRole('heading', { name: '找规律' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '我的家庭' })).toBeChecked();
  expect(screen.getByRole('article')).toHaveTextContent('小米');
});

it('says the books are on their way when the catalogue has none', async () => {
  stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': page([]),
  });
  renderFamilyPage('/family/practice');
  expect(await screen.findByText('书在路上')).toBeVisible();
  expect(screen.queryByText('书库里的书都安排出去了')).toBeNull();
});

it('waits for the family shelf before saying why the library is empty, and says when it did not open', async () => {
  let familyShelf: () => unknown = () => new Promise(() => {});
  stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': (url: URL) =>
      url.searchParams.get('shelf') === 'family' ? familyShelf() : page([]),
  });
  renderFamilyPage('/family/practice');
  expect(await screen.findByText('正在打开书架…')).toBeInTheDocument();
  expect(screen.queryByText('书库里的书都安排出去了')).toBeNull();
  expect(screen.queryByText('书在路上')).toBeNull();
  cleanup();
  familyShelf = () => Response.json({}, { status: 503 });
  renderFamilyPage('/family/practice');
  expect(await screen.findByText('书架没打开')).toBeVisible();
  expect(screen.queryByText('书库里的书都安排出去了')).toBeNull();
  familyShelf = () => page([familyBook('book-patterns', '找规律', { [mi]: 0 })]);
  await userEvent.click(screen.getByRole('button', { name: '再试一次' }));
  expect(await screen.findByText('书库里的书都安排出去了')).toBeVisible();
});

it("opens a child's given books from the address and takes one back, saying when it fails", async () => {
  const fetcher = stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    [`GET parents/children/${mi}/books`]: page([childBook('book-patterns', '找规律', true, 5)]),
    [`DELETE parents/children/${mi}/assignments/book-patterns`]: new Response(null, {
      status: 500,
    }),
  });
  const user = userEvent.setup();
  renderFamilyPage(`/family/practice?child=${mi}&state=assigned`);
  const card = await screen.findByRole('article');
  expect(screen.getByRole('radio', { name: '小米' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '已安排' })).toBeChecked();
  expect(card).toHaveTextContent('5/12');
  const [address] = requests(fetcher, 'GET').find(([url]) => url.includes('/books'))!;
  expect(address).toContain('state=assigned');

  await user.click(within(card).getByRole('button', { name: /^为小米.*《找规律》$/ }));
  expect(await within(card).findByRole('alert')).toHaveTextContent('没取消成功，再点一次。');
  expect(within(card).getByRole('button', { name: /^为小米.*《找规律》$/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('loads the next batch from the button and offers it again when a batch fails', async () => {
  let failNext = true;
  stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': (url: URL) => {
      if (url.searchParams.get('offset') === '0')
        return page([familyBook('book-first', '第一本')], 2, true);
      if (failNext) {
        failNext = false;
        return Response.json({}, { status: 503 });
      }
      return page([familyBook('book-second', '第二本')], 2);
    },
  });
  const user = userEvent.setup();
  renderFamilyPage('/family/practice');
  await screen.findByRole('heading', { name: '第一本' });
  await user.click(screen.getByRole('button', { name: '加载更多' }));
  expect(await screen.findByText('这一批没加载出来')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '加载更多' }));
  expect(await screen.findByRole('heading', { name: '第二本' })).toBeVisible();
  expect(screen.getByText('一共 2 本，都在这里了')).toBeVisible();
});

it('invites a child first, and lets a family without children browse the library', async () => {
  stubFetch({
    'GET session': session,
    'GET parents/children': family([]),
    'GET parents/books': page([familyBook('book-patterns', '找规律')]),
  });
  renderFamilyPage('/family/practice');
  expect(await screen.findByRole('heading', { name: '找规律' })).toBeVisible();
  expect(screen.getByText('孩子加入家庭以后，就能给孩子安排书')).toBeVisible();
  expect(screen.getByRole('link', { name: '邀请孩子' })).toBeVisible();
  expect(screen.queryByRole('radio', { name: '书库' })).toBeNull();
  expect(screen.queryByRole('button', { name: /安排/ })).toBeNull();
});

it('says what an empty filter left out and clears it', async () => {
  const fetcher = stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': (url: URL) =>
      url.searchParams.get('grade') ? page([]) : page([familyBook('book-patterns', '找规律')]),
  });
  const user = userEvent.setup();
  renderFamilyPage(`/family/practice?grade=${encodeURIComponent('二年级')}`);
  expect(await screen.findByText('这里还没有书')).toBeVisible();
  expect(screen.getByText('二年级 · 全部科目')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '看全部的书' }));
  expect(await screen.findByRole('heading', { name: '找规律' })).toBeVisible();
  expect(requests(fetcher, 'GET').some(([url]) => url.includes('grade='))).toBe(true);
});

it('offers to try again when the shelf does not open', async () => {
  let open = false;
  stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': () =>
      open ? page([familyBook('book-patterns', '找规律')]) : Response.json({}, { status: 500 }),
  });
  const user = userEvent.setup();
  renderFamilyPage('/family/practice');
  expect(await screen.findByText('书架没打开')).toBeVisible();
  open = true;
  await user.click(screen.getByRole('button', { name: '再试一次' }));
  expect(await screen.findByRole('heading', { name: '找规律' })).toBeVisible();
});

it('reads the shelves again only once a change closed in the list has had its answer', async () => {
  let answer: (response: Response) => void = () => {};
  let libraryReads = 0;
  stubFetch({
    'GET session': session,
    'GET parents/children': twoChildren,
    'GET parents/books': (url: URL) => {
      if (url.searchParams.get('shelf') === 'library') libraryReads += 1;
      return page([familyBook('book-patterns', '找规律')]);
    },
    [`PUT parents/children/${mi}/assignments/book-patterns`]: () =>
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
  });
  const user = userEvent.setup();
  renderFamilyPage('/family/practice');
  await screen.findByRole('heading', { name: '找规律' });
  await user.click(screen.getByRole('button', { name: '安排《找规律》' }));
  await user.click(screen.getByRole('button', { name: '为小米安排《找规律》' }));
  await user.keyboard('{Escape}');
  expect(libraryReads).toBe(1);
  answer(new Response(null, { status: 204 }));
  await waitFor(() => expect(libraryReads).toBe(2));
});
