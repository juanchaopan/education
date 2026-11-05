import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecoveryForm } from './RecoveryForm';
const meta = {
  component: RecoveryForm,
  args: { email: '', onEmailChange: () => {}, onSubmit: () => {} },
} satisfies Meta<typeof RecoveryForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Pending: Story = { args: { pending: true } };
export const Error: Story = { args: { error: '暂时无法完成，请稍后再试。' } };
export const LongMessage: Story = { args: { error: '连接中断，请保留输入并稍后再试。'.repeat(6) } };
export const Requested: Story = { args: { received: true } };
