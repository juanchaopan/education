import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookFilters } from './BookFilters';
import { childBookCounts } from './child-book-fixtures';

const meta = {
  title: 'Family/BookFilters',
  component: BookFilters,
  args: { counts: childBookCounts(), onFilter: () => {} },
} satisfies Meta<typeof BookFilters>;
export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
export const Learning: Story = { args: { filter: 'learning' } };
export const NoNewBooks: Story = { args: { counts: childBookCounts({ fresh: 0 }) } };
export const NoneUnavailable: Story = { args: { counts: childBookCounts({ unavailable: 0 }) } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
