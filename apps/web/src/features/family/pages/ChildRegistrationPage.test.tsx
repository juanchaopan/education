import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { accountArt } from '../../../test/account-art';
import { ChildRegistrationPage } from './ChildRegistrationPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Where the way on leads, and what it carries there.
function SignIn() {
  const { state } = useLocation();
  return <output aria-label="带去登录">{JSON.stringify(state)}</output>;
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/join']}>
        <Routes>
          <Route path="/join" element={<ChildRegistrationPage art={accountArt} />} />
          <Route path="/login/child" element={<SignIn />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it('reuses the request on network failure, clears secrets on success and never stores inputs', async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init) => {
      calls.push(init.body);
      if (calls.length === 1) throw new Error('network interrupted');
      return Response.json({
        status: 'registered',
        familyCode: 'ABCD-EFGH-JKMN',
        nickname: '小明',
      });
    }),
  );
  open();
  expect(screen.getByRole('heading', { name: '加入家庭', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '已有账号？去登录' })).toHaveAttribute(
    'href',
    '/login/child',
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('家长给我的 KEY'), 'ABCDEFGHJKMNPQRS');
  await user.type(screen.getByLabelText('我的昵称'), '小明');
  const pin = screen.getByLabelText('设置六位数字 PIN');
  expect(pin).toHaveAttribute('autocomplete', 'new-password');
  await user.type(pin, '018274');
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认结果');
  expect(calls).toHaveLength(1);
  expect(JSON.parse(calls[0]!)).toMatchObject({ key: 'ABCD-EFGH-JKMN-PQRS' });
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(await screen.findByRole('heading', { name: '你已加入家庭！' })).toBeVisible();
  expect(calls[0]).toBe(calls[1]);
  expect(screen.getByLabelText('我的家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  expect(screen.getByText('记住自己刚才设置的六位 PIN，不要发给别人。')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('018274')).toBeNull();
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  await user.click(screen.getByRole('link', { name: '去登录' }));
  expect(screen.getByRole('status', { name: '带去登录' })).toHaveTextContent(
    JSON.stringify({ familyCode: 'ABCD-EFGH-JKMN', nickname: '小明' }),
  );
});

it('starts a new request once a field changes after a failure', async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init) => {
      calls.push(init.body);
      return Response.json({ message: '这个 KEY 已使用、已撤销或已过期。' }, { status: 409 });
    }),
  );
  open();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('家长给我的 KEY'), 'ABCDEFGHJKMNPQRS');
  await user.type(screen.getByLabelText('我的昵称'), '小明');
  await user.type(screen.getByLabelText('设置六位数字 PIN'), '018274');
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('这个 KEY 已使用');
  await user.type(screen.getByLabelText('我的昵称'), '呀');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  expect(JSON.parse(calls[0]!).requestId).not.toBe(JSON.parse(calls[1]!).requestId);
});
