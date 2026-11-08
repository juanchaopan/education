import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LessonBoundary } from './LessonBoundary';
import { LessonRoute, type LessonPage } from './LessonRoute';

// React reports every error a boundary catches; these tests make them on
// purpose.
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => {
  vi.mocked(console.error).mockRestore();
  vi.unstubAllGlobals();
});

it('shows a way to open a lesson again when its files did not load', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  const missing: LessonPage = lazy(() => Promise.reject(new TypeError('Failed to fetch module')));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonRoute lesson={missing} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: '这道题没有打开' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '再试一次' })).toBeInTheDocument();
});

it('tells the page once that the lesson did not open, and shows the fallback in its place', () => {
  const onFailure = vi.fn();
  function Broken(): never {
    throw new Error('broken');
  }
  render(
    <LessonBoundary fallback={<p>没有打开</p>} onFailure={onFailure}>
      <Broken />
    </LessonBoundary>,
  );
  expect(screen.getByText('没有打开')).toBeInTheDocument();
  expect(onFailure).toHaveBeenCalledOnce();
});
