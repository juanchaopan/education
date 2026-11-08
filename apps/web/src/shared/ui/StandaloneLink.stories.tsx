import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { StandaloneLink } from './StandaloneLink';

const meta = {
  title: '公共部件/独立链接',
  component: StandaloneLink,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { to: '/', children: '回到探索首页' },
} satisfies Meta<typeof StandaloneLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Back: Story = {};
