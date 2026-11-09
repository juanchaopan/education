import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { focusManager } from '@tanstack/react-query';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { pageWrapper } from '../../../test/page-wrapper';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';
const key = {
  id: 'bb51e85f-1306-4bcd-9811-35e27c6e9638',
  status: 'active',
  expiresAt: '2030-01-01T00:00:00.000Z',
};
const value = 'ABCD-EFGH-JKMN-PQRS';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
});

// How the page stands toward a reload, as the update check reads it.
function PageReadiness() {
  return <output aria-label="刷新">{usePageReadiness().readiness}</output>;
}

type StatusReads = 'answer' | 'fail' | 'wait';

// The panel on a page, and a server whose status reads can be held or made
// to fail once a KEY has been generated.
function setup(recent = true, familyCode?: string) {
  const server = { generated: false, revoked: false, reads: 'answer' as StatusReads };
  const answer = () =>
    Response.json({
      key: server.generated ? { ...key, status: server.revoked ? 'revoked' : 'active' } : null,
      reauthenticationRequired: !recent,
      ...(familyCode ? { familyCode } : {}),
    });
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      if (_url.endsWith('/revoke')) {
        server.revoked = true;
        return new Response(null, { status: 204 });
      }
      server.generated = true;
      return Response.json({ key, value });
    }
    if (server.reads === 'fail') return new Response(null, { status: 503 });
    if (server.reads === 'wait') return new Promise<Response>(() => {});
    return answer();
  });
  vi.stubGlobal('fetch', fetcher);
  const Page = pageWrapper();
  const view = render(
    <Page>
      <RegistrationKeyPanel csrf={'a'.repeat(43)} />
      <PageReadiness />
    </Page>,
  );
  return { fetcher, view, Page, server };
}

// Reads the KEY status again, as the page does when it shows again.
function readStatusAgain() {
  act(() => focusManager.setFocused(false));
  act(() => focusManager.setFocused(true));
}

async function generate() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '生成注册 KEY' }));
  expect(await screen.findByText(value)).toBeVisible();
  return user;
}

const readiness = () => screen.getByRole('status', { name: '刷新' });

it('shows the key once, clears raw text on refresh, and revokes without automatic retries', async () => {
  const { fetcher } = setup();
  const user = await generate();
  expect(screen.getByText(/只在这次生成后显示/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: '复制注册 KEY' }));
  expect(await navigator.clipboard.readText()).toBe(value);
  await user.click(screen.getByRole('button', { name: '刷新 KEY 状态' }));
  expect(screen.queryByText(value)).toBeNull();
  await user.click(await screen.findByRole('button', { name: '撤销注册 KEY' }));
  expect(await screen.findByText('已撤销')).toBeVisible();
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2);
});
it('holds a reload while a new key is on screen, until the parent closes it', async () => {
  setup();
  const user = await generate();
  expect(readiness()).toHaveTextContent('showing');
  await user.click(screen.getByRole('button', { name: '刷新 KEY 状态' }));
  expect(screen.queryByText(value)).toBeNull();
  expect(readiness()).toHaveTextContent('ready');
});
it('keeps the hold while the status is read again, after which the key shows once more', async () => {
  const { server } = setup();
  await generate();
  server.reads = 'wait';
  readStatusAgain();
  expect(await screen.findByText('正在确认 KEY 状态…')).toBeVisible();
  expect(screen.queryByText(value)).toBeNull();
  expect(readiness()).toHaveTextContent('showing');
});
it('lets the page reload once the status no longer shows the key', async () => {
  const { server } = setup();
  await generate();
  server.revoked = true;
  readStatusAgain();
  expect(await screen.findByText('已撤销')).toBeVisible();
  expect(screen.queryByText(value)).toBeNull();
  expect(readiness()).toHaveTextContent('ready');

  cleanup();
  const failing = setup();
  await generate();
  failing.server.reads = 'fail';
  readStatusAgain();
  expect(await screen.findByText(/暂时无法完成/)).toBeVisible();
  expect(screen.queryByText(value)).toBeNull();
  expect(readiness()).toHaveTextContent('ready');
});
it('lets the page reload once the parent leaves the page with a key still shown', async () => {
  const { view, Page } = setup();
  await generate();
  expect(readiness()).toHaveTextContent('showing');
  view.rerender(
    <Page>
      <PageReadiness />
    </Page>,
  );
  expect(readiness()).toHaveTextContent('ready');
});
it('requires current-password reauthentication before key mutations', async () => {
  setup(false);
  expect(await screen.findByLabelText('确认家长密码')).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  expect(screen.getByRole('button', { name: '生成注册 KEY' })).toBeDisabled();
});

it('keeps the assigned family code visible and copyable without generating another KEY', async () => {
  const user = userEvent.setup();
  const { fetcher } = setup(true, 'ABCD-EFGH-JKMN');
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  await user.click(screen.getByRole('button', { name: '复制家庭码' }));
  expect(await navigator.clipboard.readText()).toBe('ABCD-EFGH-JKMN');
  await user.click(screen.getByRole('button', { name: '刷新 KEY 状态' }));
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  expect(fetcher.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
});
