import { onlineManager, useMutation } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { forgetFullscreen, inFullscreen } from '../../test/fake-fullscreen';
import { queryWrapper } from '../../test/query-wrapper';
import { useLeave } from './useLeave';

const catalog = '/?grade=一年级&subject=数学&category=学而思';

// A write the test settles itself, standing in for a final answer.
function deferred() {
  let settle: { resolve: () => void; reject: (error: Error) => void } | undefined;
  const promise = new Promise<void>((resolve, reject) => (settle = { resolve, reject }));
  return { promise, ...settle! };
}

function Problem({ write }: { write?: Promise<void> }) {
  const { version } = useParams();
  const { leave, waiting } = useLeave(catalog);
  const answer = useMutation({ mutationFn: () => write ?? Promise.resolve() });
  return (
    <>
      <h1>第 {version} 版</h1>
      <button type="button" onClick={() => answer.mutate()}>
        交答案
      </button>
      <button type="button" onClick={leave}>
        {waiting ? '等一下' : '返回'}
      </button>
    </>
  );
}

function open(entries: string[], write?: Promise<void>) {
  const Query = queryWrapper();
  render(
    <Query>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/" element={<h1>题库</h1>} />
          <Route path="/child" element={<h1>孩子空间</h1>} />
          <Route path="/problems/:id/:version" element={<Problem write={write} />} />
        </Routes>
      </MemoryRouter>
    </Query>,
  );
}

afterEach(() => {
  cleanup();
  forgetFullscreen();
  onlineManager.setOnline(true);
});

it('goes back to the page of the site the child came from', async () => {
  open(['/child', '/problems/garden/1']);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '孩子空间' })).toBeVisible();
});

it("goes to the problem's own category when the link was opened directly", async () => {
  open(['/problems/garden/1']);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '题库' })).toBeVisible();
});

it('leaves again from another entry the same page shows', async () => {
  open(['/', '/problems/garden/1', '/problems/garden/2']);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '第 1 版' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '题库' })).toBeVisible();
});

it('waits for a write on its way, then leaves once, even when it fails', async () => {
  const write = deferred();
  open(['/', '/problems/garden/1'], write.promise);
  await userEvent.click(screen.getByRole('button', { name: '交答案' }));
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  await userEvent.click(screen.getByRole('button', { name: '等一下' }));
  expect(screen.queryByRole('heading', { name: '题库' })).toBeNull();
  await act(async () => write.reject(new Error('暂时连不上，请重试。')));
  expect(await screen.findByRole('heading', { name: '题库' })).toBeVisible();
});

it('does not wait for a write held back while the device is offline', async () => {
  onlineManager.setOnline(false);
  open(['/', '/problems/garden/1'], deferred().promise);
  await userEvent.click(screen.getByRole('button', { name: '交答案' }));
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '题库' })).toBeVisible();
});

it('leaves full screen before it goes', async () => {
  const exit = vi.fn(async () => inFullscreen(null));
  document.exitFullscreen = exit;
  inFullscreen(document.documentElement);
  open(['/', '/problems/garden/1']);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(await screen.findByRole('heading', { name: '题库' })).toBeVisible();
  expect(exit).toHaveBeenCalledOnce();
});
