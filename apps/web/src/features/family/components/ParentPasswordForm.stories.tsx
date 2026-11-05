import type { Meta, StoryObj } from '@storybook/react-vite';
import { ParentPasswordForm } from './ParentPasswordForm';
const meta = {
  component: ParentPasswordForm,
  args: { password: '', onChange: () => {}, onSubmit: () => {} },
} satisfies Meta<typeof ParentPasswordForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Pending: Story = { args: { password: 'synthetic-password', pending: true } };

export const ChildReset: Story = {
  args: { id: 'reset-parent-password', label: '重置 PIN 前确认家长密码', purpose: '重置孩子 PIN' },
};
