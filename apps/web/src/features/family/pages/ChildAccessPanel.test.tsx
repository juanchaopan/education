import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChildAccessPanel } from './ChildAccessPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const child = {
  id: '00000000-0000-4000-8000-000000000001',
  nickname: '小鹿',
  credentialVersion: 1,
};
function setup(options: { recent?: boolean; children?: (typeof child)[]; status?: number } = {}) {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? new Response(null, { status: options.status ?? 204 })
      : Response.json({
          children: options.children ?? [child],
          reauthenticationRequired: options.recent === false,
        }),
  );
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChildAccessPanel csrf={'a'.repeat(43)} />
    </QueryClientProvider>,
  );
  return fetcher;
}
it('shows real children and confirms the consequence before a single version-bound reset, clearing PIN inputs afterwards', async () => {
  const user = userEvent.setup(),
    fetcher = setup();
  await user.click(await screen.findByRole('button', { name: '为小鹿重置 PIN' }));
  await user.type(screen.getByLabelText('新的六位 PIN'), '937261');
  await user.type(screen.getByLabelText('再输入一次新 PIN'), '937262');
  await user.click(screen.getByRole('button', { name: '确认重置并退出旧登录' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('两次 PIN 不一致');
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  await user.clear(screen.getByLabelText('再输入一次新 PIN'));
  await user.type(screen.getByLabelText('再输入一次新 PIN'), '937261');
  await user.click(screen.getByRole('button', { name: '确认重置并退出旧登录' }));
  expect(await screen.findByText(/已重置小鹿的 PIN/)).toBeVisible();
  expect(screen.queryByLabelText('新的六位 PIN')).toBeNull();
  const posts = fetcher.mock.calls.filter(([, init]) => init?.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(JSON.parse(posts[0]![1]!.body as string)).toEqual({
    childId: child.id,
    credentialVersion: 1,
    pin: '937261',
  });
});
it('shows empty and reauthentication states without pretending a reset succeeded', async () => {
  setup({ children: [], recent: false });
  expect(await screen.findByText(/还没有关联的孩子/)).toBeVisible();
  expect(screen.queryByRole('button', { name: '确认重置并退出旧登录' })).toBeNull();
});
it('requires recent reauthentication and offers no reset until it succeeds', async () => {
  setup({ recent: false });
  expect(await screen.findByRole('button', { name: '为小鹿重置 PIN' })).toBeDisabled();
  expect(screen.getByLabelText('重置 PIN 前确认家长密码')).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
});
it('does not retry uncertain or stale requests and clears PINs while explaining that the parent must refresh', async () => {
  const user = userEvent.setup(),
    fetcher = setup({ status: 409 });
  await user.click(await screen.findByRole('button', { name: '为小鹿重置 PIN' }));
  await user.type(screen.getByLabelText('新的六位 PIN'), '937261');
  await user.type(screen.getByLabelText('再输入一次新 PIN'), '937261');
  await user.click(screen.getByRole('button', { name: '确认重置并退出旧登录' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('已有更新');
  expect(screen.queryByLabelText('新的六位 PIN')).toBeNull();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});
