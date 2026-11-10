import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta = {
  title: '公共部件/卡片',
  component: Card,
  args: {
    'aria-labelledby': 'story-card-title',
    children: (
      <>
        <h2 id="story-card-title">我的家庭码</h2>
        <p>家庭码固定不变，可以随时回来查看或复制。</p>
      </>
    ),
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Raised: Story = {};
export const Flat: Story = { args: { flat: true } };
export const Danger: Story = {
  args: {
    tone: 'danger',
    children: (
      <>
        <h2 id="story-card-title">删除家庭</h2>
        <p>删除后无法恢复。</p>
      </>
    ),
  },
};
export const LongText: Story = {
  args: {
    children: (
      <>
        <h2 id="story-card-title">parent-with-a-very-long-address@example.test</h2>
        <p>{'没有空格的长文字也会在卡片里换行。'.repeat(8)}</p>
      </>
    ),
  },
};
