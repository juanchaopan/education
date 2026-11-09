import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './IconButton';

const meta = {
  title: '公共部件/图标按钮',
  component: IconButton,
  args: { icon: 'home', label: '回到探索首页', onClick: () => {} },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Disabled: Story = { args: { disabled: true } };

// Frosted glass over a picture, here a dusky gradient standing in for a
// lesson's backdrop.
export const OverAPicture: Story = {
  args: { icon: 'back', label: '返回', glass: true },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'inline-grid',
          padding: 'var(--space-6)',
          background: 'linear-gradient(135deg, #2f4f3a, #c98c4b)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
