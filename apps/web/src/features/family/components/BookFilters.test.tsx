import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { BookFilters } from './BookFilters';
import { childBookCounts } from './child-book-fixtures';

it('offers every filter with its count, all of them chosen without a filter', () => {
  render(<BookFilters counts={childBookCounts()} onFilter={vi.fn()} />);
  expect(screen.getByRole('radiogroup', { name: '筛选' })).toBeInTheDocument();
  const radios = screen.getAllByRole('radio');
  expect(radios.map((radio) => radio.textContent)).toEqual([
    '全部14',
    '在学91',
    '学完4',
    '暂时不可用1',
  ]);
  expect(screen.getByRole('radio', { name: /^全部/ })).toBeChecked();
});

it('marks the new books on 在学 and leaves the mark off without them', () => {
  const { rerender } = render(
    <BookFilters counts={childBookCounts({ fresh: 2 })} onFilter={vi.fn()} />,
  );
  expect(screen.getByLabelText('2 本新书')).toHaveTextContent('2');
  rerender(<BookFilters counts={childBookCounts({ fresh: 0 })} onFilter={vi.fn()} />);
  expect(screen.queryByLabelText(/本新书/)).not.toBeInTheDocument();
});

it('shows 暂时不可用 only when some book is', () => {
  render(<BookFilters counts={childBookCounts({ unavailable: 0 })} onFilter={vi.fn()} />);
  expect(screen.queryByRole('radio', { name: /暂时不可用/ })).not.toBeInTheDocument();
});

it('chooses a filter by a press or the arrow keys, and all of them again', async () => {
  const onFilter = vi.fn();
  const { rerender } = render(
    <BookFilters counts={childBookCounts()} filter="finished" onFilter={onFilter} />,
  );
  expect(screen.getByRole('radio', { name: /^学完/ })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: /^在学/ }));
  expect(onFilter).toHaveBeenLastCalledWith('learning');
  await userEvent.click(screen.getByRole('radio', { name: /^全部/ }));
  expect(onFilter).toHaveBeenLastCalledWith(undefined);
  rerender(<BookFilters counts={childBookCounts()} filter="finished" onFilter={onFilter} />);
  screen.getByRole('radio', { name: /^学完/ }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(onFilter).toHaveBeenLastCalledWith('unavailable');
});
