import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dewdrop } from './Dewdrop';

// Drops sit in a lesson's painting; a sunlit gradient stands in for one, its
// brightest part behind them, where glass is hardest to read.
const meta = {
  title: '公共部件/露珠按钮',
  component: Dewdrop,
  args: { icon: 'replay', label: '重听这一句', onClick: () => {} },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'inline-flex',
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
          background: 'linear-gradient(135deg, #f6d9a0, #6f9a6c 55%, #2f4f3a)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dewdrop>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Clear: Story = {};
export const Agree: Story = { args: { icon: 'check', label: '对', tone: 'ok' } };
export const TryAgain: Story = { args: { icon: 'sayAgain', label: '重说', tone: 'honey' } };
export const Microphone: Story = {
  args: { icon: 'mic', label: '按住问小兔', tone: 'clay', size: 'large' },
};
// The badge is only drawn; the name says the same, so a child who asks for
// the drop by what it shows is understood.
export const WithBadge: Story = {
  args: { icon: 'bulb', label: '给我一个提示，还有 2 个', badge: 2 },
};
export const ToggledOff: Story = {
  args: { icon: 'soundOff', label: '声音', 'aria-pressed': false },
};
export const Disabled: Story = { args: { disabled: true } };
