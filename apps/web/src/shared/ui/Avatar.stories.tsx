import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta = {
  title: '公共部件/头像',
  component: Avatar,
  args: { name: '小鹿' },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const First: Story = {};
export const Second: Story = { args: { name: 'parent@example.test', place: 1 } };
export const Small: Story = { args: { size: 'small' } };
