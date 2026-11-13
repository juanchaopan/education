import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { accountArt } from '../../../test/account-art';
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

// The server: nobody signed in until a sign-in succeeds, unless the parent
// already is.
function serve({ parentIn = false } = {}) {
  let signedIn = parentIn;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/api/v1/session'))
      return signedIn ? Response.json(parent) : new Response(null, { status: 401 });
    if (url.endsWith('/parents/login')) {
      signedIn = true;
      return Response.json(parent);
    }
    if (url.endsWith('/children/login')) return Response.json(child);
    return new Response(null, { status: 401 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function Address() {
  const { pathname, search } = useLocation();
  return <output aria-label="地址">{pathname + search}</output>;
}

function open(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<SignInPage art={accountArt} />} />
          <Route path="*" element={<p>别的页面</p>} />
        </Routes>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const address = () => screen.getByRole('status', { name: '地址' });

it("opens on the child's sign-in and keeps the chosen tab in the address", async () => {
  serve();
  open('/');
  expect(screen.getByRole('tab', { name: '孩子登录' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByLabelText('我的家庭码')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '有 KEY？去注册' })).toHaveAttribute('href', '/join');
  await userEvent.click(screen.getByRole('tab', { name: '家长登录' }));
  expect(address()).toHaveTextContent('/?tab=parent');
  expect(await screen.findByLabelText('登录邮箱')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '忘记密码' })).toHaveAttribute('href', '/family/recover');
  await userEvent.click(screen.getByRole('tab', { name: '孩子登录' }));
  expect(address()).toHaveTextContent(/^\/$/);
});

it('signs a child in and remembers the family code and nickname', async () => {
  const fetch = serve();
  open('/');
  await userEvent.type(screen.getByLabelText('我的家庭码'), 'ABCD-EFGH-JKMN');
  await userEvent.type(screen.getByLabelText('我的昵称'), '小鹿');
  await userEvent.type(screen.getByLabelText('我的六位 PIN'), '018274');
  await userEvent.click(screen.getByRole('button', { name: '进入我的空间' }));
  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/v1/children/login', expect.anything()),
  );
  await vi.waitFor(() =>
    expect(JSON.parse(localStorage.getItem('education-child-locator') ?? '{}')).toEqual({
      familyCode: 'ABCD-EFGH-JKMN',
      nickname: '小鹿',
    }),
  );
  expect(screen.getByLabelText('我的六位 PIN')).toHaveValue('');
});

it('takes a parent who signs in on the way to a problem back to it', async () => {
  serve();
  open('/?tab=parent&next=%2Fproblems%2Fgarden-balance%2F1');
  await userEvent.type(await screen.findByLabelText('登录邮箱'), 'parent@example.test');
  await userEvent.type(screen.getByLabelText('登录密码'), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent('/problems/garden-balance/1');
});

it('takes a parent who signs in without a problem, or with another page, to the parent space', async () => {
  serve();
  open('/?tab=parent&next=https%3A%2F%2Fexample.com%2F');
  await userEvent.type(await screen.findByLabelText('登录邮箱'), 'parent@example.test');
  await userEvent.type(screen.getByLabelText('登录密码'), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByText('别的页面')).toBeInTheDocument();
  expect(address()).toHaveTextContent('/family');
});

it('sends a parent already signed in on to the parent space, and still lets a child sign in', async () => {
  serve({ parentIn: true });
  open('/?tab=parent');
  expect(await screen.findByText('已经登录家长账号')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '进入家长空间' })).toHaveAttribute('href', '/family');
  expect(screen.queryByLabelText('登录邮箱')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: '孩子登录' }));
  expect(screen.getByLabelText('我的家庭码')).toBeInTheDocument();
});
