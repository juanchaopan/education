import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProblemSummary } from '@education/contracts';
import { ProblemPage, type ProblemPages } from './ProblemPage';
import type { Viewer } from '../model';
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
const art = { backdrop: '/backdrop.webp', teacher: '/teacher.webp' };
const child: Viewer = { kind: 'child', csrf: 'c'.repeat(43) };
const parent: Viewer = { kind: 'parent', csrf: 'p'.repeat(43) };

function FixturePage({ problem, csrf }: { problem: ProblemSummary; csrf?: string }) {
  return (
    <>
      <h1>{problem.title}</h1>
      <p>{csrf ? '记下进度' : '只看'}</p>
      <label>
        我的想法
        <input />
      </label>
      <Link to={problemPath(current.id, current.version)}>打开新版</Link>
      <Link to={problemPath(previous.id, previous.version)}>再看旧版</Link>
    </>
  );
}

const renderPage = (problem: ProblemSummary, csrf?: string) => (
  <FixturePage problem={problem} csrf={csrf} />
);
const pages: ProblemPages = new Map([
  [problemPath(previous.id, previous.version), renderPage],
  [problemPath(current.id, current.version), renderPage],
]);

// Any other page, as far as these tests need it: the address it was opened at.
function Elsewhere() {
  const { pathname, search } = useLocation();
  return <h1>别处 {decodeURIComponent(`${pathname}${search}`)}</h1>;
}

function serve() {
  const fetchProblem = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.includes('missing')) return new Response(null, { status: 404 });
    return Response.json(url.endsWith('/1') ? previous : current);
  });
  vi.stubGlobal('fetch', fetchProblem);
  return fetchProblem;
}

function open(path: string, viewer: Viewer = child) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/problems/:id/:version"
            element={<ProblemPage pages={pages} viewer={viewer} art={art} />}
          />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('opens exact versions for a child and resets page state when switching versions', async () => {
  const fetchProblem = serve();
  open(problemPath(previous.id, previous.version));
  const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: '练习旧版' })).toBeVisible();
  expect(screen.getByText('记下进度')).toBeVisible();
  await user.type(screen.getByRole('textbox', { name: '我的想法' }), '旧版文字');
  await user.click(screen.getByRole('link', { name: '打开新版' }));
  expect(await screen.findByRole('heading', { name: '练习新版' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: '我的想法' })).toHaveValue('');
  await user.click(screen.getByRole('link', { name: '再看旧版' }));
  expect(await screen.findByRole('heading', { name: '练习旧版' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: '我的想法' })).toHaveValue('');
  expect(fetchProblem.mock.calls.map(([url]) => url)).toEqual(
    expect.arrayContaining([
      '/api/v1/problems/fixture-review/1',
      '/api/v1/problems/fixture-review/2',
    ]),
  );
  expect(fetchProblem.mock.calls[0]![1]).toMatchObject({
    headers: { 'X-CSRF-Token': 'c'.repeat(43) },
  });
});

it("goes back from a link opened directly to the child's home", async () => {
  serve();
  open(problemPath(current.id, current.version));
  await screen.findByRole('heading', { name: '练习新版' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /' })).toBeVisible();
});

it('shows a parent the problem without keeping anything, and goes back to the parent space', async () => {
  serve();
  open(problemPath(current.id, current.version), parent);
  expect(await screen.findByText('只看')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /family' })).toBeVisible();
});

it('shows nobody signed in only the way to sign in and come back, asking nothing', async () => {
  const fetchProblem = serve();
  open(problemPath(current.id, current.version), { kind: 'guest' });
  expect(screen.getByRole('heading', { name: '登录后才能打开这道题' })).toBeVisible();
  expect(screen.queryByText('练习新版')).toBeNull();
  expect(fetchProblem).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('link', { name: '去登录' }));
  expect(
    await screen.findByRole('heading', { name: '别处 /?next=/problems/fixture-review/2' }),
  ).toBeVisible();
});

it('waits without asking while it is not yet known who is signed in', () => {
  const fetchProblem = serve();
  open(problemPath(current.id, current.version), { kind: 'checking' });
  expect(screen.getByRole('heading', { name: '正在打开这道题' })).toBeVisible();
  expect(fetchProblem).not.toHaveBeenCalled();
});

it('goes back home from a problem that cannot be found', async () => {
  serve();
  open('/problems/missing/1');
  await screen.findByRole('heading', { name: '这道题暂时不可用' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /' })).toBeVisible();
});
