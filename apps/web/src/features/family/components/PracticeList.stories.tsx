import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { PracticeList } from './PracticeList';

const meta = {
  component: PracticeList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { learner: true },
} satisfies Meta<typeof PracticeList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AvailableAndWithdrawn: Story = {
  args: {
    problems: [
      { id: 'fixture-pattern', version: 2, title: '辨认规律' },
      { id: 'fixture-pattern', version: 1, title: null },
    ],
  },
};
export const Empty: Story = { args: { problems: [] } };
