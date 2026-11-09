import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FamilyPage } from './FamilyPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const password = 'a private phrase for this family';
const art = { backdrop: '/backdrop.webp', teacher: '/teacher.webp' };

function setup(response: () => Promise<Response>) {
  const fetcher = vi
    .fn()
    .mockImplementation((_url: string, options?: RequestInit) =>
      _url.endsWith('/session')
        ? Promise.resolve(Response.json({}, { status: 401 }))
        : options?.method === 'POST'
          ? response()
          : Promise.resolve(Response.json({ enabled: true })),
    );
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FamilyPage art={art} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetcher;
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('家长邮箱'), 'parent@example.test');
  await user.type(screen.getByLabelText('设置密码'), password);
  await user.click(screen.getByRole('button', { name: '提交注册' }));
}

it('opens on the sign-up with its privacy note and counts the password towards its length', async () => {
  setup(() => new Promise(() => {}));
  expect(await screen.findByRole('heading', { name: '创建家长账号' })).toBeVisible();
  expect(screen.getByLabelText('家长邮箱')).toHaveAccessibleDescription(
    '请使用您自己的邮箱，不需要填写孩子的信息。',
  );
  await userEvent.type(screen.getByLabelText('设置密码'), 'short');
  expect(screen.getByLabelText('设置密码')).toHaveAccessibleDescription(
    '可以是一句话 · 还差 10 个字符',
  );
});

it('shows an honest pending-verification receipt without claiming mail was sent', async () => {
  const fetcher = setup(async () =>
    Response.json({ status: 'pending-verification', mail: 'not-sent' }, { status: 202 }),
  );
  await fillAndSubmit();
  expect(await screen.findByRole('heading', { name: '注册申请已受理' })).toBeVisible();
  expect(screen.getByText(/尚未发送验证邮件/)).toBeVisible();
  expect(screen.queryByLabelText('设置密码')).toBeNull();
  expect(fetcher.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(1);
});

it('keeps typed inputs after a server failure and allows a deliberate retry', async () => {
  setup(async () => Response.json({ message: 'private backend error' }, { status: 503 }));
  await fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法完成注册');
  expect(screen.getByLabelText('设置密码')).toHaveValue(password);
  expect(screen.getByRole('button', { name: '提交注册' })).toBeEnabled();
  expect(screen.queryByText('private backend error')).toBeNull();
});

it('prevents repeat submission while a request is pending', async () => {
  const fetcher = setup(() => new Promise(() => {}));
  await fillAndSubmit();
  expect(screen.getByRole('button', { name: '正在保存，请稍等…' })).toBeDisabled();
  expect(fetcher.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(1);
});

it('explains a lost response in Chinese without claiming registration failed or succeeded', async () => {
  setup(async () => {
    throw new TypeError('Failed to fetch');
  });
  await fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认注册结果');
  expect(screen.queryByText('Failed to fetch')).toBeNull();
  expect(screen.getByLabelText('设置密码')).toHaveValue(password);
});

it('switches between sign-up and sign-in with the same button, which keeps the focus', async () => {
  setup(() => new Promise(() => {}));
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '已有账号？去登录' }));
  expect(screen.getByRole('heading', { name: '家长登录' })).toBeVisible();
  expect(screen.getByRole('button', { name: '还没有账号？去注册' })).toHaveFocus();
  expect(screen.getByRole('link', { name: '忘记密码' })).toHaveAttribute('href', '/family/recover');
});
