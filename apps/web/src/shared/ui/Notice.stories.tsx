import type { Meta, StoryObj } from '@storybook/react-vite';
import { Notice } from './Notice';

const meta = {
  title: '公共部件/提示条',
  component: Notice,
  args: { children: '已加入这位孩子的练习。' },
} satisfies Meta<typeof Notice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { children: '删除已经受理，系统会自动完成删除。' } };
export const Success: Story = { args: { tone: 'success' } };
export const Error: Story = {
  args: { tone: 'error', children: '邮箱或密码不正确，或登录状态已失效。' },
};
export const Block: Story = {
  args: {
    tone: 'success',
    as: 'div',
    children: (
      <>
        <h3>注册申请已受理</h3>
        <p>请登录后发送验证邮件并完成验证。</p>
      </>
    ),
  },
};
export const LongText: Story = {
  args: { tone: 'error', children: '连接暂时中断，请保留已填写的信息，稍后再试。'.repeat(6) },
};
