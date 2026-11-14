import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { ForgotPin } from './ForgotPin';

it('opens and closes a line saying a parent resets the PIN', async () => {
  render(<ForgotPin />);
  const toggle = screen.getByRole('button', { name: '忘了 PIN' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('请家长在家长空间帮你重置。')).not.toBeVisible();
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('请家长在家长空间帮你重置。')).toBeVisible();
  await userEvent.click(toggle);
  expect(screen.queryByText('请家长在家长空间帮你重置。')).not.toBeVisible();
});
