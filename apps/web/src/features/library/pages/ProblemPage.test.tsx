import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProblemSummary } from '@education/contracts';
import { ProblemPage } from './ProblemPage';
import { problemPath } from '../model';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('opens exact versions without progress gating and resets page state when switching versions', async () => {
  const fetchProblem = vi.fn(async (url: string) =>
    Response.json(url.endsWith('/1') ? previous : current),
  );
  vi.stubGlobal('fetch', fetchProblem);
  const renderPage = (problem: ProblemSummary) => <FixturePage problem={problem} />;
  const pages = new Map([
    [problemPath(previous.id, previous.version), renderPage],
    [problemPath(current.id, current.version), renderPage],
  ]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[problemPath(previous.id, previous.version)]}>
        <Routes>
          <Route path="/problems/:id/:version" element={<ProblemPage pages={pages} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
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
