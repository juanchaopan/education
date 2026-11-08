import type { Meta, StoryObj } from '@storybook/react-vite';
import { Loading } from './Loading';

const meta = {
  title: '公共部件/加载',
  component: Loading,
  args: { label: '正在读取家庭码…' },
} satisfies Meta<typeof Loading>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};
