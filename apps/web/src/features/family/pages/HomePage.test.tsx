import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ChildBookPage } from '@education/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { accountArt } from '../../../test/account-art';
import { childBook, childBookCounts } from '../components/child-book-fixtures';
import { HomePage } from './HomePage';

const child = { role: 'child', nickname: '小米', csrfToken: 'c'.repeat(43) };
const childArt = { day: '/day.webp', night: '/night.webp', teacher: '/teacher.webp' };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const fresh = childBook({
  id: 'g1-chinese-pinyin',
  name: '拼音乐园',
  subject: '语文',
  fresh: true,
  done: 0,
  studiedAt: null,
});
const going = childBook();
const finished = childBook({ id: 'g1-math-thinking', name: '思维训练', done: 5 });

function books(filter: string | null): ChildBookPage {
  const counts = childBookCounts({ all: 3, learning: 2, finished: 1, unavailable: 0, fresh: 1 });
  if (filter === 'finished') return { counts, books: [finished], hasMore: false };
  if (filter === 'unavailable') return { counts, books: [], hasMore: false };
  return { counts, books: [fresh, going, finished], hasMore: false };
}

type Session = 'in' | 'out' | 'unknown';

// The server: the child signed in until signing out, with three books, or
// nobody signed in, or a session that cannot be checked just now.
function serve({ session = 'in' as Session, shelf = books } = {}) {
  let state = session;
  const fetch = vi.fn(async (address: string) => {
    const url = new URL(address, 'https://education.example');
    if (url.pathname === '/api/v1/children/session') {
      if (state === 'unknown') return new Response(null, { status: 503 });
      return state === 'in' ? Response.json(child) : new Response(null, { status: 401 });
    }
    if (url.pathname === '/api/v1/children/logout') {
      state = 'out';
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/api/v1/children/assignments')
      return Response.json(shelf(url.searchParams.get('books')));
    return new Response(null, { status: 401 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function Address() {
  const { pathname, search } = useLocation();
  return <output aria-label="地址">{pathname + search}</output>;
}

function open(path = '/') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomePage art={accountArt} childArt={childArt} />} />
          <Route path="*" element={<p>题目页</p>} />
        </Routes>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const address = () => screen.getByRole('status', { name: '地址' });

it('shows a signed-in child their books, new ones marked, under the filters', async () => {
  serve();
  open();
  expect(await screen.findByRole('heading', { name: '我的书', level: 1 })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: '拼音乐园' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByLabelText('1 本新书')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^拼音乐园，新书/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /小米/ })).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});

it('keeps the filter and the open book in the address, and closes the book on a new filter', async () => {
  const fetch = serve();
  open();
  await userEvent.click(await screen.findByRole('button', { name: /^学而思/ }));
  expect(address()).toHaveTextContent('/?open=g1-math-xueersi');
  const card = screen.getAllByRole('article')[1]!;
  expect(within(card).getAllByRole('link')).toHaveLength(5);
  await userEvent.click(screen.getByRole('radio', { name: /^学完/ }));
  expect(address()).toHaveTextContent(/^\/\?books=finished$/);
  expect(await screen.findByRole('heading', { name: '思维训练' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/children/assignments?offset=0&books=finished',
    expect.anything(),
  );
});

it('keeps the filters and the focus on the one chosen by the arrow keys while it is read', async () => {
  serve();
  open();
  await screen.findByRole('heading', { name: '拼音乐园' });
  screen.getByRole('radio', { name: /^全部/ }).focus();
  await userEvent.keyboard('{ArrowRight}');
  const learning = screen.getByRole('radio', { name: /^在学/ });
  expect(learning).toHaveFocus();
  expect(learning).toHaveAttribute('aria-checked', 'true');
  expect(await screen.findByRole('heading', { name: '拼音乐园' })).toBeInTheDocument();
  expect(learning).toHaveFocus();
});

it('says when a filter holds no books, with the way back to all of them', async () => {
  serve();
  open('/?books=unavailable');
  expect(await screen.findByText('这里还没有书')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '看全部的书' }));
  expect(address()).toHaveTextContent(/^\/$/);
});

it('tells a child without books who gives them', async () => {
  serve({
    shelf: () => ({
      counts: childBookCounts({ all: 0, learning: 0, finished: 0, unavailable: 0, fresh: 0 }),
      books: [],
      hasMore: false,
    }),
  });
  open();
  expect(await screen.findByText('家长还没有给你安排书')).toBeInTheDocument();
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});

it('goes straight on to the problem a signed-in child was sent here for', async () => {
  serve();
  open('/?next=%2Fproblems%2Fgarden-balance%2F1');
  expect(await screen.findByText('题目页')).toBeInTheDocument();
  expect(address()).toHaveTextContent('/problems/garden-balance/1');
});

it('turns into the sign-in once the child signs out', async () => {
  serve();
  open();
  await userEvent.click(await screen.findByRole('button', { name: /小米/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: '退出登录' }));
  expect(await screen.findByRole('tab', { name: '孩子登录' })).toBeInTheDocument();
});

it('shows the sign-in to anyone else', async () => {
  serve({ session: 'out' });
  open();
  expect(await screen.findByRole('tab', { name: '孩子登录' })).toBeInTheDocument();
  expect(screen.queryByText('我的书')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('lets a child sign in when the session cannot be checked, saying the account is safe', async () => {
  serve({ session: 'unknown' });
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认登录状态');
  expect(screen.getByLabelText('我的家庭码')).toBeInTheDocument();
});
