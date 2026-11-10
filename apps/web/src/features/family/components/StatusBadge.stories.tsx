import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: '家长空间/状态徽章',
  component: StatusBadge,
  args: { tone: 'ok', children: '已授权' },
} satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Settled: Story = {};
export const Waiting: Story = { args: { tone: 'wait', children: '待验证' } };
