import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page } from './Page';

const meta = {
  title: '公共部件/页面标题',
  component: Page,
  args: {
    titleId: 'story-page-title',
    title: '家长空间',
    children: <p>页面的内容从标题下开始。</p>,
  },
} satisfies Meta<typeof Page>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithContent: Story = {};
export const LongTitle: Story = { args: { title: '这条小路还没找到，'.repeat(4) } };
