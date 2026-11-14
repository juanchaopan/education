import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreviewMark } from './PreviewMark';

// The mark sits on a lesson's painting; a plain warm field stands in for it.
const meta = {
  title: 'Library/PreviewMark',
  component: PreviewMark,
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--space-5)', background: '#8f7b5a' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewMark>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Previewing: Story = {};
