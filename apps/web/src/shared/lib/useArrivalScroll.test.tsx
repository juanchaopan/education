import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { useArrivalScroll } from './useArrivalScroll';

function Page({ name }: { name: string }) {
  useArrivalScroll();
  return (
    <>
      <h1 id="top-part">{name}</h1>
      <h2 id="last-part">最后一部分</h2>
      <Link to="/other#last-part">去另一页的最后一部分</Link>
      <Link to="/other">去另一页</Link>
    </>
  );
}

function setup(start = '/') {
  render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/" element={<Page name="这一页" />} />
        <Route path="/other" element={<Page name="另一页" />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

it('opens a linked page at the part its address names', async () => {
  const scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled;
  setup();
  await userEvent.click(screen.getByRole('link', { name: '去另一页的最后一部分' }));
  expect(await screen.findByRole('heading', { name: '另一页' })).toBeVisible();
  expect(scrolled).toHaveBeenCalled();
  expect(scrolled.mock.contexts.at(-1)).toBe(screen.getByRole('heading', { name: '最后一部分' }));
});

it('opens a linked page without a named part at the top', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  setup();
  await userEvent.click(screen.getByRole('link', { name: '去另一页' }));
  expect(await screen.findByRole('heading', { name: '另一页' })).toBeVisible();
  expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
});

it('leaves a malformed named part alone instead of breaking the page', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  setup('/other#%E0%A4');
  expect(screen.getByRole('heading', { name: '另一页' })).toBeVisible();
});
