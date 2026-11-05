import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordResetForm } from './PasswordResetForm';
const meta = {
  component: PasswordResetForm,
  args: {
    password: '',
    confirmation: '',
    onPasswordChange: () => {},
    onConfirmationChange: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof PasswordResetForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Pending: Story = { args: { pending: true } };
export const Error: Story = { args: { error: '暂时无法完成，请稍后再试。' } };
export const LongMessage: Story = { args: { error: '连接中断，请保留输入并稍后再试。'.repeat(6) } };
