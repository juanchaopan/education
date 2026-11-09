import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: '公共部件/按钮',
  component: Button,
  args: { children: '进入我的空间', onClick: () => {} },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', children: '已有账号？去登录' } };
export const Text: Story = { args: { variant: 'text', children: '取消' } };
export const Danger: Story = { args: { variant: 'danger', children: '永久删除家庭' } };
export const Disabled: Story = { args: { disabled: true, children: '正在打开你的空间…' } };
export const Regular: Story = { args: { weight: 'regular', children: '再试一次' } };
export const LongLabel: Story = {
  args: { children: '确认重置并退出这个孩子在所有设备上的旧登录，再用新 PIN 登录' },
};
