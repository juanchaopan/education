import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { IconLink } from './IconLink';

const meta = {
  title: '公共部件/图标链接',
  component: IconLink,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { to: '/family/practice', icon: 'plus', label: '安排练习' },
} satisfies Meta<typeof IconLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Plus: Story = {};
