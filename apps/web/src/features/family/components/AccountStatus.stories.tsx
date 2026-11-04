import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountStatus } from './AccountStatus';
const session = {
  role: 'parent' as const,
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only' as const,
  csrfToken: 'a'.repeat(43),
};
const meta = { component: AccountStatus, args: { session, onLogout: () => {} } } satisfies Meta<
  typeof AccountStatus
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Restricted: Story = {};
export const Verified: Story = {
  args: { session: { ...session, emailVerified: true, access: 'verified' } },
};
export const Pending: Story = { args: { pending: true } };
export const Error: Story = { args: { error: '连接中断，请稍后重试。' } };
export const RefreshFailed: Story = { args: { refreshing: true } };
export const LongEmail: Story = {
  args: { session: { ...session, email: 'a-long-synthetic-family-email-address@example.test' } },
};
