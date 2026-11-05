import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FamilyPage } from './FamilyPage';
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only',
  csrfToken: 'a'.repeat(43),
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(mode: 'success' | 'failure' | 'remembered' = 'success') {
  let loggedIn = mode === 'remembered';
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/session'))
      return loggedIn ? Response.json(session) : Response.json({}, { status: 401 });
    if (url.endsWith('/login')) {
      if (mode === 'failure') return Response.json({ message: 'private error' }, { status: 401 });
      loggedIn = true;
      return Response.json(session);
    }
    if (url.endsWith('/logout')) {
      loggedIn = false;
      expect(options?.headers).toMatchObject({ 'X-CSRF-Token': session.csrfToken });
      return new Response(null, { status: 204 });
    }
    return Response.json({ enabled: true });
  });
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FamilyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetcher;
}
async function login() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '已有账号？去登录' }));
  expect(screen.getByLabelText('登录密码')).toHaveAttribute('autocomplete', 'current-password');
  await user.type(screen.getByLabelText('登录邮箱'), 'parent@example.test');
  await user.type(screen.getByLabelText('登录密码'), 'secret phrase');
  await user.click(screen.getByRole('button', { name: '登录' }));
}
it('shows real restricted status after login and clears the account on successful logout', async () => {
  setup();
  await login();
  expect(await screen.findByRole('heading', { name: '我的家长账号' })).toBeVisible();
  expect(screen.getByText(/邮箱待验证/)).toBeVisible();
  expect(screen.queryByLabelText('登录密码')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: '退出账号' }));
  expect(await screen.findByRole('heading', { name: '家长登录' })).toBeVisible();
  expect(screen.queryByText(session.email)).toBeNull();
});
it('restores the server session without asking for a password', async () => {
  setup('remembered');
  expect(await screen.findByRole('heading', { name: '我的家长账号' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '登录' })).toBeNull();
});
it('keeps input on wrong credentials and never renders raw backend errors', async () => {
  setup('failure');
  await login();
  expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码不正确');
  expect(screen.getByLabelText('登录密码')).toHaveValue('secret phrase');
  expect(screen.queryByText('private error')).toBeNull();
});
