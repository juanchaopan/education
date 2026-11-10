import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Brand } from './Brand';

const meta = {
  title: '公共部件/品牌',
  component: Brand,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/family']}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Brand>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Named: Story = {};
