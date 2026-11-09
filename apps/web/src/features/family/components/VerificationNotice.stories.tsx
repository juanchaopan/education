import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../../../shared/ui/Card';
import { VerificationNotice } from './VerificationNotice';

const meta = {
  component: VerificationNotice,
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
  args: {
    email: 'parent@example.test',
    onSend: () => {},
    onRefresh: () => {},
    status: { enabled: true, status: 'not-sent', retryAfter: 0, canRetry: false },
  },
} satisfies Meta<typeof VerificationNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Disabled: Story = {
  args: { status: { enabled: false, status: 'not-sent', retryAfter: 0, canRetry: false } },
};
export const Accepted: Story = {
  args: { status: { enabled: true, status: 'accepted', retryAfter: 55, canRetry: false } },
};
export const Retryable: Story = {
  args: { status: { enabled: true, status: 'retryable', retryAfter: 0, canRetry: true } },
};
export const Unknown: Story = {
  args: { status: { enabled: true, status: 'unknown', retryAfter: 0, canRetry: false } },
};
export const Expired: Story = {
  args: { status: { enabled: true, status: 'expired', retryAfter: 0, canRetry: false } },
};
export const Verified: Story = {
  args: { status: { enabled: true, status: 'verified', retryAfter: 0, canRetry: false } },
};
export const Loading: Story = { args: { loading: true, status: undefined } };
export const Error: Story = { args: { error: '连接中断，请先刷新状态并检查收件箱。' } };
export const LongEmail: Story = {
  args: { email: 'a-long-synthetic-family-email-address-for-layout@example.test' },
};
