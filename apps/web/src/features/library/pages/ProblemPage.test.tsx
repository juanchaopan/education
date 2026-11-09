import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProblemSummary } from '@education/contracts';
import { ProblemPage, type ProblemPages } from './ProblemPage';
import { problemPath } from '../../../shared/lib/problem-path';

const current: ProblemSummary = {
  id: 'fixture-review',
  version: 2,
  title: '练习新版',
  grade: '1年级',
  subject: '语文',
  category: '阅读',
  sequence: 1,
};
const previous = { ...current, version: 1, title: '练习旧版' };

function FixturePage({ problem }: { problem: ProblemSummary }) {
  return (
    <>
      <h1>{problem.title}</h1>
      <label>
        我的想法
        <input />
      </label>
      <Link to={problemPath(current.id, current.version)}>打开新版</Link>
      <Link to={problemPath(previous.id, previous.version)}>再看旧版</Link>
    </>
  );
}

const renderPage = (problem: ProblemSummary) => <FixturePage problem={problem} />;
const pages: ProblemPages = new Map([
  [problemPath(previous.id, previous.version), renderPage],
  [problemPath(current.id, current.version), renderPage],
]);

// The catalog, as far as these tests need it: the address it was opened at.
function Catalog() {
  const { pathname, search } = useLocation();
  return <h1>题库 {decodeURIComponent(`${pathname}${search}`)}</h1>;
}

function serve() {
  const fetchProblem = vi.fn(async (url: string) => {
    if (url.includes('missing')) return new Response(null, { status: 404 });
    return Response.json(url.endsWith('/1') ? previous : current);
  });
  vi.stubGlobal('fetch', fetchProblem);
  return fetchProblem;
}

function open(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/problems/:id/:version" element={<ProblemPage pages={pages} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('opens exact versions without progress gating and resets page state when switching versions', async () => {
  const fetchProblem = serve();
  open(problemPath(previous.id, previous.version));
  const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: '练习旧版' })).toBeVisible();
  await user.type(screen.getByRole('textbox', { name: '我的想法' }), '旧版文字');
  await user.click(screen.getByRole('link', { name: '打开新版' }));
  expect(await screen.findByRole('heading', { name: '练习新版' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: '我的想法' })).toHaveValue('');
  await user.type(screen.getByRole('textbox', { name: '我的想法' }), '新版文字');
  await user.click(screen.getByRole('link', { name: '再看旧版' }));
  expect(await screen.findByRole('heading', { name: '练习旧版' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: '我的想法' })).toHaveValue('');
  expect(fetchProblem.mock.calls.map(([url]) => url)).toEqual(
    expect.arrayContaining([
      '/api/v1/problems/fixture-review/1',
      '/api/v1/problems/fixture-review/2',
    ]),
  );
});

it("goes back from a link opened directly to the problem's own category", async () => {
  serve();
  open(problemPath(current.id, current.version));
  await screen.findByRole('heading', { name: '练习新版' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(
    await screen.findByRole('heading', { name: '题库 /?grade=1年级&subject=语文&category=阅读' }),
  ).toBeVisible();
});

it('goes back to the catalog from a problem that cannot be found', async () => {
  serve();
  open('/problems/missing/1');
  await screen.findByRole('heading', { name: '这道题暂时不可用' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '题库 /' })).toBeVisible();
});
