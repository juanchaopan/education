import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShelfFilters } from './ShelfFilters';

const meta = {
  component: ShelfFilters,
  args: {
    grades: ['一年级', '二年级', '三年级'],
    subjects: ['数学', '语文', '英语'],
    value: { grade: '一年级', subject: '', state: '' },
    byState: false,
    onChange: () => {},
  },
} satisfies Meta<typeof ShelfFilters>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Library: Story = {};
export const OneChild: Story = {
  args: { byState: true, value: { grade: '一年级', subject: '语文', state: 'assigned' } },
};
