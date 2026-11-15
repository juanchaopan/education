import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { address, renderFamilyPage } from '../../../test/family-page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const parent = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'p'.repeat(43),
};

type Session = 'in' | 'out' | 'unknown';

// The server: the parent signed out, signed in, or a session that cannot be
// read just now; signing in and out change it. Every other read of the
// parent space waits.
function serve(session: Session) {
  let state = session;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/api/v1/session')) {
        if (state === 'unknown') return new Response(null, { status: 503 });
        return state === 'in' ? Response.json(parent) : new Response(null, { status: 401 });
      }
      if (url.endsWith('/parents/login')) {
        state = 'in';
        return Response.json(parent);
      }
      if (url.endsWith('/parents/logout')) {
        state = 'out';
        return new Response(null, { status: 204 });
      }
      return new Promise<Response>(() => {});
    }),
  );
}

async function signIn() {
  await userEvent.type(await screen.findByLabelText('登录邮箱'), parent.email);
  await userEvent.type(screen.getByLabelText('登录密码'), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
}

it('sends a signed-out parent to the parent sign-in, which comes back to the address asked for', async () => {
  const scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled;
  serve('out');
  renderFamilyPage('/family/privacy?x=1#family-deletion-title');
  expect(await screen.findByRole('tab', { name: '家长登录' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(address()).toHaveTextContent(
    /^\/login\/parent\?next=%2Ffamily%2Fprivacy%3Fx%3D1%23family-deletion-title$/,
  );
  expect(screen.queryByRole('heading', { name: '隐私与数据' })).toBeNull();
  await signIn();
  expect(await screen.findByRole('navigation', { name: '家长空间' })).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/family\/privacy\?x=1#family-deletion-title$/);
});

it('says on the sign-in when the session could not be read', async () => {
  serve('unknown');
  renderFamilyPage('/family');
  expect(await screen.findByText('暂时无法恢复登录状态，请稍后刷新或重新登录。')).toBeVisible();
  expect(address()).toHaveTextContent(/^\/login\/parent\?next=%2Ffamily$/);
  expect(screen.getByLabelText('登录邮箱')).toBeInTheDocument();
});

it('lands a parent who signs out on the parent sign-in itself', async () => {
  serve('in');
  renderFamilyPage('/family/profile');
  await userEvent.click(await screen.findByRole('button', { name: '退出账号' }));
  expect(await screen.findByLabelText('登录邮箱')).toBeInTheDocument();
  expect(address()).toHaveTextContent(/^\/login\/parent$/);
  expect(screen.getByRole('link', { name: '忘记密码' })).toHaveAttribute(
    'href',
    '/password/forgot',
  );
  expect(screen.getByRole('link', { name: '创建账号' })).toHaveAttribute('href', '/signup');
});
