import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AssignToggle } from './AssignToggle';

const forMi = { child: '小米', book: '学而思' };

it('gives a book that is not given, as a switch that is off named for whom and which book', async () => {
  const onToggle = vi.fn();
  render(<AssignToggle assigned={false} {...forMi} onToggle={onToggle} />);
  const button = screen.getByRole('button', { name: '为小米安排《学而思》', pressed: false });
  await userEvent.click(button);
  expect(onToggle).toHaveBeenCalledOnce();
});

it('takes back a given book, offering to under a pointer or focus', async () => {
  const onToggle = vi.fn();
  render(<AssignToggle assigned {...forMi} onToggle={onToggle} />);
  const button = screen.getByRole('button', { pressed: true });
  expect(button).toHaveAccessibleName(/^为小米已安排/);
  expect(button).toHaveTextContent('取消安排');
  await userEvent.click(button);
  expect(onToggle).toHaveBeenCalledOnce();
});

it('keeps its look but cannot be pressed while the server has not answered', async () => {
  const onToggle = vi.fn();
  render(<AssignToggle assigned={false} pending {...forMi} onToggle={onToggle} />);
  const button = screen.getByRole('button', { name: '为小米安排《学而思》，正在安排' });
  expect(button).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(button);
  expect(onToggle).not.toHaveBeenCalled();
});

it('only takes back an unavailable book, and cannot give one', () => {
  const { rerender } = render(<AssignToggle assigned unavailable {...forMi} onToggle={() => {}} />);
  expect(
    screen.getByRole('button', { name: '为小米取消安排《学而思》', pressed: true }),
  ).toBeVisible();
  rerender(<AssignToggle assigned={false} unavailable {...forMi} onToggle={() => {}} />);
  expect(screen.getByRole('button', { name: '暂时不能安排' })).toBeDisabled();
});
