import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Icon } from './Icon';
import { LinkButton } from './LinkButton';

const meta = {
  title: '公共部件/按钮链接',
  component: LinkButton,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    to: '/family/children#invite',
    children: (
      <>
        <Icon name="key" />
        邀请孩子
      </>
    ),
  },
} satisfies Meta<typeof LinkButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
