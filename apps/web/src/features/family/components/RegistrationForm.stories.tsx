import type { Meta, StoryObj } from '@storybook/react-vite';
import { RegistrationForm } from './RegistrationForm';

const meta = {
  title: '家长空间/注册',
  component: RegistrationForm,
  args: {
    email: '',
    password: '',
    available: true,
    onEmailChange: () => {},
    onPasswordChange: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof RegistrationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = {
  args: { email: 'parent@example.test', password: 'a private family phrase' },
};
export const Pending: Story = { args: { ...Filled.args, pending: true } };
export const Unavailable: Story = {
  args: { available: false, notice: '注册服务尚未配置，请稍后再来。' },
};
export const Error: Story = { args: { error: '暂时无法完成注册，请稍后重试。' } };
export const Submitted: Story = { args: { submitted: true } };
export const LongMessage: Story = {
  args: {
    error:
      '暂时无法完成注册。请保留当前页面，稍后再试。重复提交不会创建另一个家庭，也不会覆盖已有密码。',
  },
};
