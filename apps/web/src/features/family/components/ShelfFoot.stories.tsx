import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShelfFoot } from './ShelfFoot';

const meta = {
  component: ShelfFoot,
  args: { state: 'more', total: 40, onMore: () => {} },
} satisfies Meta<typeof ShelfFoot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const More: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Failed: Story = { args: { state: 'failed' } };
export const Done: Story = { args: { state: 'done' } };
