import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookListFoot } from './BookListFoot';

const meta = {
  title: 'Family/BookListFoot',
  component: BookListFoot,
  args: { state: 'more', touch: false, onMore: () => {} },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookListFoot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const More: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const LoadingByTouch: Story = { args: { state: 'loading', touch: true } };
export const Failed: Story = { args: { state: 'failed' } };
export const Done: Story = { args: { state: 'done' } };
