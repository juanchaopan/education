import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

it('toggles from anywhere on its label and reports the new state', async () => {
  const change = vi.fn();
  render(<Checkbox label="记住我" checked={false} onChange={change} />);
  await userEvent.click(screen.getByText('记住我'));
  expect(change).toHaveBeenCalledWith(true);
  expect(screen.getByRole('checkbox', { name: '记住我' })).not.toBeChecked();
});

it('reports unchecking a checked box', async () => {
  const change = vi.fn();
  render(<Checkbox label="记住我" checked onChange={change} />);
  await userEvent.click(screen.getByRole('checkbox', { name: '记住我' }));
  expect(change).toHaveBeenCalledWith(false);
});
