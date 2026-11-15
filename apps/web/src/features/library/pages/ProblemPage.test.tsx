import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProblemOpening } from '@education/contracts';
import { ProblemPage, type ProblemAccess, type ProblemPages } from './ProblemPage';
import type { Viewer } from '../model';
import { problemPath } from '../../../shared/lib/problem-path';

const current: ProblemOpening = {
  id: 'fixture-review',
  version: 2,
  title: '练习新版',
  grade: '1年级',
  subject: '语文',
  category: '阅读',
  sequence: 1,
  mode: 'practice',
  book: 'fixture-book',
};
const previous = { ...current, version: 1, title: '练习旧版' };
const art = { backdrop: '/backdrop.webp', teacher: '/teacher.webp' };
const child: Viewer = { kind: 'child', csrf: 'c'.repeat(43) };
const parent: Viewer = { kind: 'parent', csrf: 'p'.repeat(43) };

function FixturePage({ problem, access }: { problem: ProblemOpening; access: ProblemAccess }) {
  return (
    <>
      <h1>{problem.title}</h1>
      <p>{problem.mode === 'practice' ? '记下进度' : '只看'}</p>
      <label>
        我的想法
        <input />
      </label>
      <Link to={problemPath(current.id, current.version)}>打开新版</Link>
      <Link to={problemPath(previous.id, previous.version)}>再看旧版</Link>
      <button type="button" onClick={access.onRefused}>
        被拒绝了
      </button>
    </>
  );
}

const renderPage = (problem: ProblemOpening, access: ProblemAccess) => (
  <FixturePage problem={problem} access={access} />
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

const refusal = (reason: string) =>
  Response.json({ message: '这本书暂时不可用。', reason }, { status: 403 });

// Answers each problem as the server would: missing, refused for a reason
// named in the id, or opened.
function serve(answer = (url: string) => Response.json(url.endsWith('/1') ? previous : current)) {
  const fetchProblem = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.includes('missing')) return new Response(null, { status: 404 });
    if (url.includes('unassigned')) return refusal('unassigned');
    if (url.includes('unavailable')) return refusal('unavailable');
    return answer(url);
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

it("goes back from a link opened directly to the child's bookshelf, with the problem's book open", async () => {
  serve();
  open(problemPath(current.id, current.version));
  await screen.findByRole('heading', { name: '练习新版' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(
    await screen.findByRole('heading', { name: '别处 /books?open=fixture-book' }),
  ).toBeVisible();
});

it('shows a parent the preview, marked so, and goes back to the parent space', async () => {
  const fetchProblem = serve(() => Response.json({ ...current, mode: 'preview' }));
  open(problemPath(current.id, current.version), parent);
  expect(await screen.findByText('只看')).toBeVisible();
  expect(screen.getByText('预览')).toBeVisible();
  expect(fetchProblem.mock.calls[0]![1]).toMatchObject({
    headers: { 'X-CSRF-Token': 'p'.repeat(43) },
  });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /family' })).toBeVisible();
});

it("tells the server once that a child opened the problem's book, and nothing of a preview", async () => {
  const marks = (fetchProblem: ReturnType<typeof serve>) =>
    fetchProblem.mock.calls.filter(([url]) => url.endsWith('/opened'));
  const practised = serve();
  open(problemPath(current.id, current.version));
  await screen.findByRole('heading', { name: '练习新版' });
  await vi.waitFor(() => expect(marks(practised)).toHaveLength(1));
  expect(marks(practised)[0]).toEqual([
    '/api/v1/problems/fixture-review/2/opened',
    expect.objectContaining({ method: 'POST', body: '{}' }),
  ]);
  expect(marks(practised)[0]![1]).toMatchObject({
    headers: { 'X-CSRF-Token': 'c'.repeat(43), 'X-Education-Request': 'session' },
  });
  cleanup();
  const previewed = serve(() => Response.json({ ...current, mode: 'preview' }));
  open(problemPath(current.id, current.version), parent);
  await screen.findByText('只看');
  expect(marks(previewed)).toEqual([]);
});

it("shows nobody signed in only the way to the child's sign-in and back, asking nothing", async () => {
  const fetchProblem = serve();
  open(problemPath(current.id, current.version), { kind: 'guest' });
  expect(screen.getByRole('heading', { name: '登录后才能打开这道题' })).toBeVisible();
  expect(screen.queryByText('练习新版')).toBeNull();
  expect(fetchProblem).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('link', { name: '去登录' }));
  expect(
    await screen.findByRole('heading', {
      name: '别处 /login/child?next=/problems/fixture-review/2',
    }),
  ).toBeVisible();
});

it('shows the way to sign in again when the session has ended', async () => {
  serve(() => new Response(null, { status: 401 }));
  open(problemPath(current.id, current.version));
  expect(await screen.findByRole('heading', { name: '登录后才能打开这道题' })).toBeVisible();
});

it('waits without asking while it is not yet known who is signed in', () => {
  const fetchProblem = serve();
  open(problemPath(current.id, current.version), { kind: 'checking' });
  expect(screen.getByRole('heading', { name: '正在打开这道题' })).toBeVisible();
  expect(fetchProblem).not.toHaveBeenCalled();
});

it('goes back to the bookshelf from a problem that cannot be found', async () => {
  serve();
  open('/problems/missing/1');
  await screen.findByRole('heading', { name: '这道题暂时不可用' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /books' })).toBeVisible();
});

it('goes back home from a problem a visitor opened', async () => {
  serve();
  open(problemPath(current.id, current.version), { kind: 'guest' });
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '别处 /' })).toBeVisible();
});

it('asks a child to have the book given, and leads back to the books', async () => {
  serve();
  open('/problems/unassigned/1');
  expect(await screen.findByRole('heading', { name: '请家长安排这本书' })).toBeVisible();
  await userEvent.click(screen.getByRole('link', { name: '回到我的书' }));
  expect(await screen.findByRole('heading', { name: '别处 /books' })).toBeVisible();
});

it('tells a child or a parent the book is unavailable for now, each with their own way back', async () => {
  serve();
  open('/problems/unavailable/1');
  expect(await screen.findByRole('heading', { name: '这本书暂时不可用' })).toBeVisible();
  expect(screen.getByRole('link', { name: '回到我的书' })).toHaveAttribute('href', '/books');
  cleanup();
  open('/problems/unavailable/1', parent);
  expect(await screen.findByRole('heading', { name: '这本书暂时不可用' })).toBeVisible();
  expect(screen.getByRole('link', { name: '回到家长空间' })).toHaveAttribute('href', '/family');
});

it('asks again when the problem is refused partway through, and shows why', async () => {
  let given = true;
  const fetchProblem = serve(() => (given ? Response.json(current) : refusal('unassigned')));
  open(problemPath(current.id, current.version));
  await screen.findByRole('heading', { name: '练习新版' });
  given = false;
  await userEvent.click(screen.getByRole('button', { name: '被拒绝了' }));
  expect(await screen.findByRole('heading', { name: '请家长安排这本书' })).toBeVisible();
  expect(screen.queryByText('练习新版')).toBeNull();
  const openings = fetchProblem.mock.calls.filter(([url]) => !url.endsWith('/opened'));
  expect(openings).toHaveLength(2);
});
