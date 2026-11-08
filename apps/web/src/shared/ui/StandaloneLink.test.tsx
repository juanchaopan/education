import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { StandaloneLink } from './StandaloneLink';

it('goes where it points', async () => {
  render(
    <MemoryRouter initialEntries={['/family']}>
      <Routes>
        <Route path="/family" element={<StandaloneLink to="/">回到探索首页</StandaloneLink>} />
        <Route path="/" element={<p>探索首页</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('link', { name: '回到探索首页' }));
  expect(screen.getByText('探索首页')).toBeInTheDocument();
});
