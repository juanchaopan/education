import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

it('says how many problems of how many are done', () => {
  render(<ProgressBar done={5} total={12} />);
  expect(screen.getByText('5 / 12')).toBeInTheDocument();
});

it('says a book is finished once every problem is done', () => {
  render(<ProgressBar done={6} total={6} />);
  expect(screen.getByText('学完')).toBeInTheDocument();
  expect(screen.queryByText('6 / 6')).not.toBeInTheDocument();
});

it('says a book is unavailable instead of its progress', () => {
  render(<ProgressBar done={6} total={6} unavailable />);
  expect(screen.getByText('暂时不可用')).toBeInTheDocument();
  expect(screen.queryByText('学完')).not.toBeInTheDocument();
});
