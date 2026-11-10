import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationNotice } from './VerificationNotice';

const props = {
  email: 'parent@example.test',
  onRefresh: vi.fn(),
  status: { enabled: true, status: 'unknown' as const, retryAfter: 10, canRetry: false },
};

it('offers only explicit resend for uncertain delivery and disables it during cooldown', async () => {
  const onSend = vi.fn();
  const view = render(<VerificationNotice {...props} onSend={onSend} />);
  expect(screen.queryByRole('button', { name: '安全重试这次发送' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重新发送（旧链接失效）' })).toBeDisabled();
  view.rerender(
    <VerificationNotice {...props} onSend={onSend} status={{ ...props.status, retryAfter: 0 }} />,
  );
  await userEvent.click(screen.getByRole('button', { name: '重新发送（旧链接失效）' }));
  expect(onSend).toHaveBeenCalledWith('resend');
});

it('says accepted mail is not yet verified and badges the address as still to verify', () => {
  render(
    <VerificationNotice
      {...props}
      onSend={vi.fn()}
      status={{ ...props.status, status: 'accepted', retryAfter: 0 }}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('邮件服务商已接受请求');
  expect(screen.getByText('待验证')).toBeVisible();
});

it('offers no sending once the address is verified', () => {
  render(
    <VerificationNotice
      {...props}
      onSend={vi.fn()}
      status={{ ...props.status, status: 'verified', retryAfter: 0 }}
    />,
  );
  expect(screen.getByText('已验证')).toBeVisible();
  expect(screen.queryByRole('button', { name: '发送验证邮件' })).toBeNull();
  expect(screen.queryByRole('button', { name: '重新发送（旧链接失效）' })).toBeNull();
  expect(screen.getByRole('button', { name: '刷新发送状态' })).toBeEnabled();
});

it('lets the parent read the status again when it could not be read', async () => {
  const onRefresh = vi.fn();
  render(
    <VerificationNotice
      email={props.email}
      onSend={vi.fn()}
      onRefresh={onRefresh}
      error="暂时无法查看发送状态，请重试。"
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('暂时无法查看发送状态');
  await userEvent.click(screen.getByRole('button', { name: '刷新发送状态' }));
  expect(onRefresh).toHaveBeenCalledOnce();
});

it('badges an address the session already knows is verified while its mail status loads', () => {
  render(
    <VerificationNotice
      email={props.email}
      verified
      loading
      onSend={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
  expect(screen.getByText('已验证')).toBeVisible();
});
