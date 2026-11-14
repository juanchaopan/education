import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ChildTopBar } from './ChildTopBar';

const meta = {
  title: 'Family/ChildTopBar',
  component: ChildTopBar,
  args: { nickname: '小米', leaving: false, onLogout: () => {} },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ position: 'relative', blockSize: '14rem', background: '#7d8f7a' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ChildTopBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Leaving: Story = { args: { leaving: true } };
