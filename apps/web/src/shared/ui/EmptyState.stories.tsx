import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

const meta = {
  title: '学习界面/空状态',
  component: EmptyState,
  args: { icon: '✿', title: '好问题，正在准备中', description: '准备好后，就能从这里出发。' },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Loading: Story = {
  args: { icon: '◌', title: '正在打开探索地图', description: '请稍等一下。' },
};
export const Error: Story = {
  args: { icon: '☁', title: '刚才没能打开', actionLabel: '再试一次', onAction: () => {} },
};
export const LongText: Story = {
  args: {
    description:
      '每个人都有自己的节奏。你可以停下来想一想，也可以换个方法重新试试。画一个圆，说一句自己的想法，每一个小小的尝试都值得认真对待。',
  },
};
