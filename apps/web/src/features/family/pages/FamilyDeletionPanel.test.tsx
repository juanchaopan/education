import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { familyDeletionPhrase } from '@education/contracts';
import { renderFamilyPage } from '../../../test/family-page';
import { FamilyDeletionPanel } from './FamilyDeletionPanel';

const before = 'a'.repeat(43);
const renewed = 'b'.repeat(43);
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: renewed,
};
const passwordLabel = '删除前输入家长密码';
const phraseLabel = `输入“${familyDeletionPhrase}”确认`;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Replies = { password?: Response; deletion?: Response };

function stubFetch(reply: Replies = {}) {
  const fetcher = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.endsWith('/reauthenticate')) return reply.password ?? Response.json(session);
    if (url.endsWith('/family-deletion'))
      return reply.deletion ?? Response.json({ status: 'deleted' });
    if (url.endsWith('/session')) return Response.json({ ...session, csrfToken: before });
    return Response.json({}, { status: 503 });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

function setup(reply: Replies = {}) {
  const fetcher = stubFetch(reply);
  const onDeleted = vi.fn();
  const client = new QueryClient();
  client.setQueryData(['parent-session'], { ...session, csrfToken: before });
  render(
    <QueryClientProvider client={client}>
      <FamilyDeletionPanel csrf={before} onDeleted={onDeleted} />
    </QueryClientProvider>,
  );
  return { fetcher, client, onDeleted };
}

async function fillIn(phrase = familyDeletionPhrase) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(phraseLabel), phrase);
  await user.type(screen.getByLabelText(passwordLabel), 'parent-password');
  return user;
}

const button = () => screen.getByRole('button', { name: '永久删除家庭' });
const calls = (fetcher: ReturnType<typeof stubFetch>, path: string) =>
  fetcher.mock.calls.filter(([url]) => url.endsWith(path));

it('lists what is deleted and what stays before anything is confirmed', () => {
  setup();
  expect(screen.getByRole('heading', { name: '会被删除' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '不在删除范围内' })).toBeVisible();
  expect(screen.getByText(/无法恢复/)).toBeVisible();
  expect(screen.getByText(/会立即被永久删除/)).toBeVisible();
});

it('keeps the button disabled until the phrase is typed exactly', async () => {
  const { fetcher } = setup();
  await fillIn('删除');
  expect(button()).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
});

it('confirms the password, deletes with the renewed session, reports it and signs out', async () => {
  const { fetcher, client, onDeleted } = setup();
  const user = await fillIn();
  await user.click(button());
  await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/parents/reauthenticate',
    '/api/v1/parents/family-deletion',
  ]);
  const deletion = fetcher.mock.calls[1]![1]!;
  expect((deletion.headers as Record<string, string>)['X-CSRF-Token']).toBe(renewed);
  expect(JSON.parse(String(deletion.body))).toEqual({ confirmation: familyDeletionPhrase });
  await vi.waitFor(() => expect(client.getQueryData(['parent-session'])).toBeNull());
});

it('keeps saying a recorded deletion is pending, even after a mistyped password', async () => {
  const fetcher = stubFetch({ deletion: Response.json({ status: 'pending' }, { status: 202 }) });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FamilyDeletionPanel csrf={before} onDeleted={vi.fn()} />
    </QueryClientProvider>,
  );
  const user = await fillIn();
  await user.click(button());
  const recorded = /删除已经受理，但还没有全部完成/;
  expect(await screen.findByText(recorded)).toBeVisible();
  fetcher.mockResolvedValueOnce(new Response(null, { status: 401 }));
  await user.type(screen.getByLabelText(passwordLabel), 'wrong-password');
  await user.click(button());
  expect(await screen.findByRole('alert')).toHaveTextContent('密码不正确');
  expect(screen.getByText(recorded)).toBeVisible();
  expect(calls(fetcher, '/family-deletion')).toHaveLength(1);
});

it('does not ask to delete when the password is wrong', async () => {
  const { fetcher, onDeleted } = setup({ password: new Response(null, { status: 401 }) });
  const user = await fillIn();
  await user.click(button());
  expect(await screen.findByRole('alert')).toHaveTextContent('密码不正确');
  expect(calls(fetcher, '/family-deletion')).toHaveLength(0);
  expect(onDeleted).not.toHaveBeenCalled();
});

it('shows why the server could not accept the deletion, or that the outcome is unsure', async () => {
  const message = '暂时无法确认删除是否已经受理，请稍后重新登录查看。';
  for (const [reply, shown] of [
    [Response.json({ message }, { status: 503 }), message],
    [new Response('<html>gateway timeout</html>', { status: 504 }), '暂时无法确认删除结果'],
  ] as const) {
    const { onDeleted } = setup({ deletion: reply });
    const user = await fillIn();
    await user.click(button());
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
    expect(onDeleted).not.toHaveBeenCalled();
    cleanup();
  }
});

it('shows the family page as deleted and lets the parent register a new family', async () => {
  stubFetch();
  renderFamilyPage();
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(phraseLabel), familyDeletionPhrase);
  await user.type(screen.getByLabelText(passwordLabel), 'parent-password');
  await user.click(button());
  expect(await screen.findByRole('heading', { name: '家庭已删除' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '删除家庭' })).toBeNull();
  await user.click(screen.getByRole('button', { name: '注册新的家庭' }));
  expect(await screen.findByRole('button', { name: '已有账号？去登录' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '家庭已删除' })).toBeNull();
});
