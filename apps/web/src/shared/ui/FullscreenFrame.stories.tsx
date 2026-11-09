import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';
import { FullscreenFrame } from './FullscreenFrame';

const meta = {
  title: '公共部件/全屏画框',
  component: FullscreenFrame,
  parameters: { layout: 'fullscreen' },
  args: {
    waiting: false,
    onBack: () => {},
    children: (
      <EmptyState
        icon="sprout"
        title="这道题暂时不可用"
        description="可以返回题库，选一道其他题目。"
      />
    ),
  },
} satisfies Meta<typeof FullscreenFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

// The child pressed back while an answer was still being judged.
export const WaitingToLeave: Story = { args: { waiting: true } };
