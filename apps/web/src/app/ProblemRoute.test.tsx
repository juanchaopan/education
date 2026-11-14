import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ProblemRoute } from './ProblemRoute';

const child = { role: 'child', nickname: '小米', csrfToken: 'c'.repeat(43) };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The server, with the child signed in or nobody at all; anything else is
// not there.
function serve(childSignedIn: boolean) {
  const fetch = vi.fn(async (address: string) => {
    const { pathname } = new URL(address, 'https://education.example');
    if (pathname === '/api/v1/children/session')
      return childSignedIn ? Response.json(child) : new Response(null, { status: 401 });
    if (pathname === '/api/v1/session') return new Response(null, { status: 401 });
    return Response.json({ message: '这道题或这个版本暂时不可用。' }, { status: 404 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const asked = (fetch: ReturnType<typeof serve>, path: string) =>
  fetch.mock.calls.some(([address]) => new URL(address, 'https://x.test').pathname === path);

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/problems/visual-fixture-missing/1']}>
        <Routes>
          <Route path="/problems/:id/:version" element={<ProblemRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it("asks for no parent's session once a child is signed in", async () => {
  const fetch = serve(true);
  open();
  await waitFor(() => expect(asked(fetch, '/api/v1/problems/visual-fixture-missing/1')).toBe(true));
  expect(asked(fetch, '/api/v1/session')).toBe(false);
});

it("asks for the parent's session when no child is signed in, and then shows the way to sign in", async () => {
  const fetch = serve(false);
  open();
  expect(await screen.findByRole('heading', { name: '登录后才能打开这道题' })).toBeInTheDocument();
  expect(asked(fetch, '/api/v1/session')).toBe(true);
});
