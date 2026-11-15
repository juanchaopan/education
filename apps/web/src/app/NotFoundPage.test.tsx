import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

afterEach(cleanup);

it('names the page for a path that leads nowhere and leads back home', async () => {
  render(
    <MemoryRouter initialEntries={['/nowhere']}>
      <Routes>
        <Route path="/" element={<p>首页</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: '这条小路还没找到', level: 1 })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '回到首页' }));
  expect(screen.getByText('首页')).toBeInTheDocument();
});
