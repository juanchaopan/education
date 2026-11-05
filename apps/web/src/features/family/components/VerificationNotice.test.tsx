import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationNotice } from './VerificationNotice';
it('offers only explicit resend for uncertain delivery and disables it during cooldown', async () => {
  const onSend = vi.fn();
  const props = {
    onSend,
    onRefresh: vi.fn(),
    status: { enabled: true, status: 'unknown' as const, retryAfter: 10, canRetry: false },
  };
  const view = render(<VerificationNotice {...props} />);
  expect(screen.queryByRole('button', { name: '安全重试这次发送' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重新发送（旧链接失效）' })).toBeDisabled();
  view.rerender(<VerificationNotice {...props} status={{ ...props.status, retryAfter: 0 }} />);
  await userEvent.click(screen.getByRole('button', { name: '重新发送（旧链接失效）' }));
  expect(onSend).toHaveBeenCalledWith('resend');
});
