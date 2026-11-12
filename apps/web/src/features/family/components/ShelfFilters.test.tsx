import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ShelfFilters } from './ShelfFilters';

const value = { grade: '一年级', subject: '数学', state: '' as const };

it('offers every grade and subject the shelf has, each group a radio group', async () => {
  const onChange = vi.fn();
  render(
    <ShelfFilters
      grades={['一年级', '二年级']}
      subjects={['数学', '语文']}
      value={value}
      byState={false}
      onChange={onChange}
    />,
  );
  expect(screen.getByRole('group', { name: '年级' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '一年级' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '数学' })).toBeChecked();
  expect(screen.queryByRole('group', { name: '安排' })).toBeNull();
  await userEvent.click(screen.getByRole('radio', { name: '语文' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...value, subject: '语文' });
  await userEvent.click(screen.getByRole('radio', { name: '二年级' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...value, grade: '二年级', subject: '' });
});

it("narrows a child's shelf to the books the child has or has not", async () => {
  const onChange = vi.fn();
  render(<ShelfFilters grades={[]} subjects={[]} value={value} byState onChange={onChange} />);
  expect(screen.getAllByRole('radio', { name: '全部' })[2]).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: '未安排' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...value, state: 'unassigned' });
});
