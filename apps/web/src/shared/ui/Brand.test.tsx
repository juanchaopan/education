import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { Brand } from './Brand';

it('leads home and is named for the site', async () => {
  render(
    <MemoryRouter initialEntries={['/family']}>
      <Routes>
        <Route path="/family" element={<Brand />} />
        <Route path="/" element={<p>探索首页</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('link', { name: '小小探索家首页' }));
  expect(screen.getByText('探索首页')).toBeInTheDocument();
});
