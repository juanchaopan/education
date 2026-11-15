import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { Address } from '../../../test/Address';
import { HomePage } from './HomePage';

const child = { role: 'child', nickname: '小米', csrfToken: 'c'.repeat(43) };
const parent = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only',
  csrfToken: 'p'.repeat(43),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Signed = 'child' | 'parent' | 'nobody' | 'child unknown' | 'parent unknown';

// The server's answer to each session, by who is signed in.
function serve(signed: Signed) {
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/children/session')) {
      if (signed === 'child unknown') return new Response(null, { status: 503 });
      return signed === 'child' ? Response.json(child) : new Response(null, { status: 401 });
    }
    if (url.endsWith('/api/v1/session')) {
      if (signed === 'parent unknown') return new Response(null, { status: 503 });
      return signed === 'parent' ? Response.json(parent) : new Response(null, { status: 401 });
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<p>下一页</p>} />
        </Routes>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it.each([
  ['a signed-in child to the bookshelf', 'child', '/books'],
  ['a signed-in parent, verified or not, to the parent space', 'parent', '/family'],
  ["nobody signed in to the child's sign-in", 'nobody', '/login/child'],
  [
    "a child whose session cannot be checked to the child's sign-in",
    'child unknown',
    '/login/child',
  ],
  [
    "nobody known when the parent's cannot be checked to the child's sign-in",
    'parent unknown',
    '/login/child',
  ],
] as const)('leads %s', async (_name, signed, path) => {
  serve(signed);
  open();
  expect(await screen.findByText('下一页')).toBeInTheDocument();
  expect(screen.getByRole('status', { name: '地址' })).toHaveTextContent(new RegExp(`^${path}$`));
});

it("asks for the parent's session only once no child is signed in", async () => {
  const fetch = serve('child');
  open();
  expect(await screen.findByText('下一页')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalledWith('/api/v1/session', expect.anything());
});
