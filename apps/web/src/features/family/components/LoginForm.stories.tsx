import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginForm } from './LoginForm';
import { inCard } from './story-card';

const meta = {
  component: LoginForm,
  decorators: [inCard],
  args: {
    email: '',
    password: '',
    onEmailChange: () => {},
    onPasswordChange: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof LoginForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = {
  args: { email: 'parent@example.test', password: 'synthetic example password' },
};
export const Pending: Story = { args: { pending: true } };
export const Error: Story = { args: { error: '邮箱或密码不正确，或登录状态已失效。' } };
export const LongMessage: Story = {
  args: { error: '连接暂时中断，请保留已填写的信息，稍后再试。'.repeat(6) },
};
