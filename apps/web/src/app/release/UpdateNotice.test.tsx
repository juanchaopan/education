import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpdateNotice } from './UpdateNotice';

describe('UpdateNotice', () => {
  it('says the update waits for a save, with nothing to press', () => {
    render(<UpdateNotice phase="held" onRetry={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('更新已准备好，保存后将自动更新');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers another try when the new release is not ready yet', async () => {
    const onRetry = vi.fn();
    render(<UpdateNotice phase="stuck" onRetry={onRetry} />);
    expect(screen.getByRole('status')).toHaveTextContent('新版本还没准备好');
    await userEvent.click(screen.getByRole('button', { name: '再试一次' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
