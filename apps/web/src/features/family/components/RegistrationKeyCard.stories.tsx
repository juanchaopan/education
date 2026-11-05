import type { Meta, StoryObj } from '@storybook/react-vite';
import { RegistrationKeyCard } from './RegistrationKeyCard';
const meta = {
  component: RegistrationKeyCard,
  args: {
    password: '',
    onPasswordChange: () => {},
    onConfirm: () => {},
    onGenerate: () => {},
    onRevoke: () => {},
    onRefresh: () => {},
    onCopy: () => {},
    status: { key: null, reauthenticationRequired: false },
  },
} satisfies Meta<typeof RegistrationKeyCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Pending: Story = { args: { pending: true } };
export const Reauthenticate: Story = {
  args: { status: { key: null, reauthenticationRequired: true } },
};
export const Generated: Story = {
  args: {
    value: 'ABCD-EFGH-JKMN-PQRS',
    status: {
      reauthenticationRequired: false,
      key: {
        id: 'bb51e85f-1306-4bcd-9811-35e27c6e9638',
        status: 'active',
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
    },
  },
};
export const Error: Story = { args: { error: '连接中断，请先刷新状态后再试。' } };
export const LongMessage: Story = {
  args: { error: '暂时无法确认结果，请保留输入并稍后刷新状态。'.repeat(6) },
};
