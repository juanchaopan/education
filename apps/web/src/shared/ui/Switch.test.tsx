import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Switch } from './Switch';

it('turns on from anywhere on its label and reports the new state', async () => {
  const change = vi.fn();
  render(<Switch label="记住我" checked={false} onChange={change} />);
  await userEvent.click(screen.getByText('记住我'));
  expect(change).toHaveBeenCalledWith(true);
  expect(screen.getByRole('switch', { name: '记住我' })).not.toBeChecked();
});

it('reports turning off a switch that is on', async () => {
  const change = vi.fn();
  render(<Switch label="记住我" checked onChange={change} />);
  await userEvent.click(screen.getByRole('switch', { name: '记住我' }));
  expect(change).toHaveBeenCalledWith(false);
});

it('turns with the space key like any checkbox', async () => {
  const change = vi.fn();
  render(<Switch label="记住我" checked={false} onChange={change} />);
  screen.getByRole('switch', { name: '记住我' }).focus();
  await userEvent.keyboard(' ');
  expect(change).toHaveBeenCalledWith(true);
});
