import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

it('offers a working retry without hiding the error', async () => {
  const retry = vi.fn();
  render(
    <EmptyState
      icon="wifiOff"
      title="刚才没能打开"
      description="请再试一次"
      actionLabel="重试"
      onAction={retry}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('刚才没能打开');
  await userEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(retry).toHaveBeenCalledOnce();
});

it('offers no button without an action', () => {
  render(<EmptyState icon="sprout" title="这个分类还没有题目" description="换一个分类" />);
  expect(screen.queryByRole('button')).toBeNull();
});
