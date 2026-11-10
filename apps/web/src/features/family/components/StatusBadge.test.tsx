import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

it('is announced only when its state can change on the page', () => {
  render(
    <>
      <StatusBadge tone="wait">待验证</StatusBadge>
      <StatusBadge tone="ok" live>
        已授权
      </StatusBadge>
    </>,
  );
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('已授权');
  expect(screen.getByText('待验证')).not.toHaveAttribute('role');
});
