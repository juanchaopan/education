import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { accountArt } from '../../../test/account-art';
import { Address } from '../../../test/Address';
import { SignInPage } from './SignInPage';

const parent = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'p'.repeat(43),
};
const child = { role: 'child', nickname: '小鹿', csrfToken: 'c'.repeat(43) };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

type Session = 'none' | 'parent' | 'child' | 'unknown';

// The server: nobody signed in until a sign-in succeeds, unless the parent
// or a child already is, or the child's session cannot be checked just now.
function serve(session: Session = 'none') {
  let state = session;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/api/v1/session'))
      return state === 'parent' ? Response.json(parent) : new Response(null, { status: 401 });
    if (url.endsWith('/children/session')) {
      if (state === 'unknown') return new Response(null, { status: 503 });
      return state === 'child' ? Response.json(child) : new Response(null, { status: 401 });
    }
    if (url.endsWith('/parents/login')) {
      state = 'parent';
      return Response.json(parent);
    }
    if (url.endsWith('/children/login')) {
      state = 'child';
      return Response.json(child);
    }
    return new Response(null, { status: 401 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function open(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login/child" element={<SignInPage art={accountArt} tab="child" />} />
          <Route path="/login/parent" element={<SignInPage art={accountArt} tab="parent" />} />
          <Route path="*" element={<p>别的页面</p>} />
        </Routes>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const address = () => screen.getByRole('status', { name: '地址' });

async function parentSignsIn() {
  await userEvent.type(await screen.findByLabelText('登录邮箱'), 'parent@example.test');
  await userEvent.type(screen.getByLabelText('登录密码'), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
}

it('gives each tab its own address and keeps the page to come back to when switching', async () => {
  serve();
  open('/login/child?next=%2Fproblems%2Fgarden-balance%2F1');
  expect(screen.getByRole('tab', { name: '孩子登录' })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByLabelText('我的家庭码')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '有 KEY？去注册' })).toHaveAttribute('href', '/join');
  await userEvent.click(screen.getByRole('tab', { name: '家长登录' }));
  expect(address()).toHaveTextContent(/^\/login\/parent\?next=%2Fproblems%2Fgarden-balance%2F1$/);
  expect(await screen.findByLabelText('登录邮箱')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '忘记密码' })).toHaveAttribute(
    'href',
    '/password/forgot',
  );
  expect(screen.getByRole('link', { name: '创建账号' })).toHaveAttribute('href', '/signup');
  await userEvent.click(screen.getByRole('tab', { name: '孩子登录' }));
  expect(address()).toHaveTextContent(/^\/login\/child\?next=%2Fproblems%2Fgarden-balance%2F1$/);
});

it('signs a child in, remembers the family code and nickname, and opens the books', async () => {
  const fetch = serve();
  open('/login/child');
  await userEvent.type(await screen.findByLabelText('我的家庭码'), 'ABCD-EFGH-JKMN');
  await userEvent.type(screen.getByLabelText('我的昵称'), '小鹿');
  await userEvent.type(screen.getByLabelText('我的六位 PIN'), '018274');
  await userEvent.click(screen.getByRole('button', { name: '进入我的空间' }));
  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/v1/children/login', expect.anything()),
  );
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/books$/);
  expect(JSON.parse(localStorage.getItem('education-child-locator') ?? '{}')).toEqual({
    familyCode: 'ABCD-EFGH-JKMN',
    nickname: '小鹿',
  });
});

it('fills in the family code and nickname a child just registered with', async () => {
  serve();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter
        initialEntries={[
          { pathname: '/login/child', state: { familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿' } },
        ]}
      >
        <Routes>
          <Route path="/login/child" element={<SignInPage art={accountArt} tab="child" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByLabelText('我的家庭码')).toHaveValue('ABCD-EFGH-JKMN');
  expect(screen.getByLabelText('我的昵称')).toHaveValue('小鹿');
  expect(screen.getByLabelText('我的六位 PIN')).toHaveValue('');
});

it('sends a child already signed in straight on to the page to come back to', async () => {
  serve('child');
  open('/login/child?next=%2Fproblems%2Fgarden-balance%2F1');
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/problems\/garden-balance\/1$/);
});

it('lets a child sign in when the session cannot be checked, saying the account is safe', async () => {
  serve('unknown');
  open('/login/child');
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认登录状态');
  expect(screen.getByLabelText('我的家庭码')).toBeInTheDocument();
});

it('takes a parent who signs in back to the page asked for', async () => {
  serve();
  open('/login/parent?next=%2Ffamily%2Fpractice%3Fchild%3Dc1');
  await parentSignsIn();
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/family\/practice\?child=c1$/);
});

it.each([
  ['another site', 'https%3A%2F%2Fexample.com%2F'],
  ['a protocol-relative link', '%2F%2Fexample.com'],
  ['a backslash', '%2F%5Cexample.com'],
])('takes a parent who signs in with %s to the parent space instead', async (_name, next) => {
  serve();
  open(`/login/parent?next=${next}`);
  await parentSignsIn();
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/family$/);
});

it('offers a parent already signed in the way on, and still lets a child sign in', async () => {
  serve('parent');
  open('/login/parent');
  expect(await screen.findByText('已经登录家长账号')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '进入家长空间' })).toHaveAttribute('href', '/family');
  expect(screen.queryByLabelText('登录邮箱')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: '孩子登录' }));
  expect(await screen.findByLabelText('我的家庭码')).toBeInTheDocument();
});
