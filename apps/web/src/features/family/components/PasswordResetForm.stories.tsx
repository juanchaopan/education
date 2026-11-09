import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordResetForm } from './PasswordResetForm';
import { inCard } from './story-card';
const meta = {
  component: PasswordResetForm,
  decorators: [inCard],
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
export const LongEnough: Story = {
  args: { password: 'a new private family phrase', confirmation: 'a new private family phrase' },
};
export const Pending: Story = { args: { pending: true } };
export const Error: Story = { args: { error: '暂时无法完成，请稍后再试。' } };
export const LongMessage: Story = { args: { error: '连接中断，请保留输入并稍后再试。'.repeat(6) } };
