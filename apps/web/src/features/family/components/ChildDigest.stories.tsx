import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ChildDigest } from './ChildDigest';

const meta = {
  title: '家长空间/孩子概况',
  component: ChildDigest,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    nickname: '小米',
    place: 0,
    totals: { problems: 5, independent: 3, assisted: 2, complete: true },
    onRetry: () => {},
  },
} satisfies Meta<typeof ChildDigest>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithRecord: Story = {};
export const PartlyRead: Story = {
  args: { totals: { problems: 200, independent: 140, assisted: 61, complete: false } },
};
export const NoRecord: Story = {
  args: { place: 1, totals: { problems: 0, independent: 0, assisted: 0, complete: true } },
};
export const Loading: Story = { args: { totals: undefined, loading: true } };
export const Failed: Story = { args: { totals: undefined, failed: true } };
export const LongNickname: Story = { args: { nickname: '一个很长很长很长的昵称' } };
