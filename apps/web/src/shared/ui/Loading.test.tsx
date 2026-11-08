import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Loading } from './Loading';

it('announces what is loading', () => {
  render(<Loading label="正在读取家庭码…" />);
  expect(screen.getByRole('status')).toHaveTextContent('正在读取家庭码…');
});
