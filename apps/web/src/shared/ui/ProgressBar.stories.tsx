import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: '公共部件/进度条',
  component: ProgressBar,
  args: { done: 5, total: 12 },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Going: Story = {};
export const NotStarted: Story = { args: { done: 0, total: 10 } };
export const Finished: Story = { args: { done: 6, total: 6 } };
export const Unavailable: Story = { args: { done: 2, total: 6, unavailable: true } };
