import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { CardBook } from '../../../shared/ui/BookCard';
import { ChildChooser, type ChooserChild } from './ChildChooser';

const book: CardBook = {
  name: '学而思',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 12,
};
const family: ChooserChild[] = [
  { childId: 'mi', nickname: '小米', place: 0, assigned: false, done: 3, pending: false },
  { childId: 'le', nickname: '乐乐', place: 1, assigned: true, done: 0, pending: false },
];

function Chooser({
  onToggle = () => {},
  shown = book,
}: {
  onToggle?: (childId: string, assign: boolean) => void;
  shown?: CardBook;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChildChooser
        book={shown}
        family={family}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onToggle={onToggle}
      />
      <p>书架的其他地方</p>
    </>
  );
}

it('lists every child with their progress and switch, and keeps open after a press', async () => {
  const onToggle = vi.fn();
  const user = userEvent.setup();
  render(<Chooser onToggle={onToggle} />);
  const trigger = screen.getByRole('button', { name: '安排《学而思》' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  const list = screen.getByRole('dialog', { name: '安排《学而思》' });
  expect(list).toHaveTextContent('3/12');
  expect(screen.getByRole('button', { name: '为小米安排《学而思》' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: /^为乐乐.*《学而思》$/ }));
  expect(onToggle).toHaveBeenCalledWith('le', false);
  expect(screen.getByRole('dialog')).toBeVisible();
});

it('closes on Escape and gives the focus back to its button', async () => {
  const user = userEvent.setup();
  render(<Chooser />);
  await user.click(screen.getByRole('button', { name: '安排《学而思》' }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: '安排《学而思》' })).toHaveFocus();
});

it('closes on a press outside it or on its close button', async () => {
  const user = userEvent.setup();
  render(<Chooser />);
  await user.click(screen.getByRole('button', { name: '安排《学而思》' }));
  await user.click(screen.getByText('书架的其他地方'));
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button', { name: '安排《学而思》' }));
  await user.click(screen.getByRole('button', { name: '关闭' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('only takes back an unavailable book from the children who have it', async () => {
  const user = userEvent.setup();
  render(<Chooser shown={{ ...book, status: 'unavailable' }} />);
  const trigger = screen.getByRole('button', { name: '取消安排《学而思》' });
  await user.click(trigger);
  expect(screen.getByRole('button', { name: '暂时不能安排' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^为乐乐.*《学而思》$/ })).toHaveFocus();
});
