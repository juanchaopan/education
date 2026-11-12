import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PracticeBook } from '@education/contracts';
import { queryWrapper } from '../../../test/query-wrapper';
import { ChildPracticePanel } from './ChildPracticePanel';

const csrf = 'c'.repeat(43);
// Test fixtures only: these books never enter the problem list.
const book = (id: string, name: string): PracticeBook => ({
  id,
  name,
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 1,
  done: 0,
  items: [{ id: `${id}-problem`, version: 1, title: `${name}的题`, done: false }],
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function show(answer: (offset: string) => Response) {
  const fetcher = vi.fn(async (address: string, _init?: RequestInit) => {
    const url = new URL(address, 'https://education.example');
    return answer(url.searchParams.get('offset') ?? '');
  });
  vi.stubGlobal('fetch', fetcher);
  const Query = queryWrapper();
  render(
    <Query>
      <MemoryRouter>
        <ChildPracticePanel csrf={csrf} />
      </MemoryRouter>
    </Query>,
  );
  return fetcher;
}

it("lists the child's books ten at a time under the child's session", async () => {
  const fetcher = show((offset) =>
    offset === '0'
      ? Response.json({ books: [book('fixture-first', '第一本')], hasMore: true })
      : Response.json({ books: [book('fixture-second', '第二本')], hasMore: false }),
  );
  expect(await screen.findByRole('region', { name: '第一本' })).toBeVisible();
  const [address, init] = fetcher.mock.calls[0]!;
  expect(address).toBe('/api/v1/children/assignments?offset=0');
  expect((init as RequestInit).headers).toMatchObject({ 'X-CSRF-Token': csrf });
  await userEvent.click(screen.getByRole('button', { name: '加载更多' }));
  expect(await screen.findByRole('region', { name: '第二本' })).toBeVisible();
  expect(fetcher.mock.calls[1]![0]).toBe('/api/v1/children/assignments?offset=10');
  expect(screen.queryByRole('button', { name: '加载更多' })).toBeNull();
});

it('says when no book has been given yet', async () => {
  show(() => Response.json({ books: [], hasMore: false }));
  expect(await screen.findByText('家长还没有给你安排练习。')).toBeVisible();
});

it('offers to try again when the practice does not open', async () => {
  let open = false;
  show(() =>
    open
      ? Response.json({ books: [book('fixture-first', '第一本')], hasMore: false })
      : Response.json({}, { status: 500 }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法打开练习，请再试一次。');
  open = true;
  await userEvent.click(screen.getByRole('button', { name: '再试一次' }));
  expect(await screen.findByRole('region', { name: '第一本' })).toBeVisible();
});
