import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeedbackRequestPanel } from './FeedbackRequestPanel';

const feedback = {
  status: 'needs-work',
  instruction: '再数一数左边框里的点，数到最后一个时停一下。',
  stepId: 'count-left',
} as const;

const meta = {
  title: 'Learning/Feedback request',
  component: FeedbackRequestPanel,
  args: { state: { status: 'idle' }, canAsk: true, onAsk: () => {}, onGuide: () => {} },
} satisfies Meta<typeof FeedbackRequestPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const NothingToSend: Story = { args: { canAsk: false } };
export const Waiting: Story = { args: { state: { status: 'pending' } } };
export const TextFeedback: Story = {
  args: { state: { status: 'ready', source: 'ai', feedback, drawing: [] } },
};
export const UsageLimited: Story = {
  args: { state: { status: 'fallback', reason: 'usage-limited' } },
};
export const TimedOut: Story = { args: { state: { status: 'fallback', reason: 'timeout' } } };
export const Guidance: Story = { args: { state: { status: 'guidance' } } };
