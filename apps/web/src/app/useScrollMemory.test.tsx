import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useScrollMemory } from './useScrollMemory';

function Catalog() {
  useScrollMemory();
  return <Link to="/problems/garden/1">一棵青菜有多重</Link>;
}

function Problem() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      返回
    </button>
  );
}

// jsdom does not scroll; the window here moves wherever it is told.
function scrolledTo(y: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  window.dispatchEvent(new Event('scroll'));
}

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrolledTo(0);
  scrollTo = vi.fn((_x: number, y: number) => scrolledTo(y));
  vi.stubGlobal('scrollTo', scrollTo);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

// Opens the catalog scrolled down, then the problem, which starts at the top.
async function leaveTheCatalogAt(y: number) {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/problems/:id/:version" element={<Problem />} />
      </Routes>
    </MemoryRouter>,
  );
  act(() => scrolledTo(y));
  await userEvent.click(screen.getByRole('link', { name: '一棵青菜有多重' }));
  act(() => scrolledTo(0));
}

it('does not put a page loaded afresh where another page left the shared entry', async () => {
  sessionStorage.setItem('scroll:default', '900');
  vi.resetModules();
  const fresh = await import('./useScrollMemory');
  function Page() {
    fresh.useScrollMemory();
    return <p>家长空间</p>;
  }
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  expect(scrollTo).not.toHaveBeenCalled();
  expect(window.scrollY).toBe(0);
});

it('puts a page back where it was scrolled when the child comes back to it', async () => {
  await leaveTheCatalogAt(640);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(screen.getByRole('link', { name: '一棵青菜有多重' })).toBeVisible();
  expect(window.scrollY).toBe(640);
});

it('keeps the position the child left at when the page scrolls on its own', async () => {
  await leaveTheCatalogAt(640);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  act(() => scrolledTo(300));
  await userEvent.click(screen.getByRole('link', { name: '一棵青菜有多重' }));
  act(() => scrolledTo(0));
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  expect(window.scrollY).toBe(640);
});

it('lets the position go as soon as the child scrolls on their own', async () => {
  await leaveTheCatalogAt(640);
  await userEvent.click(screen.getByRole('button', { name: '返回' }));
  act(() => {
    window.dispatchEvent(new Event('wheel'));
    scrolledTo(100);
  });
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  expect(window.scrollY).toBe(100);
});
