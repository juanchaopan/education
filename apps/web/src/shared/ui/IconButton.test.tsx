import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

it('is named by its label and reports a press', async () => {
  const press = vi.fn();
  render(<IconButton icon="home" label="回到探索首页" onClick={press} />);
  const button = screen.getByRole('button', { name: '回到探索首页' });
  expect(button).toHaveAttribute('type', 'button');
  await userEvent.click(button);
  expect(press).toHaveBeenCalledOnce();
});
