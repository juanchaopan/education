import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatTiles } from './StatTiles';

const meta = {
  title: '家长空间/统计块',
  component: StatTiles,
  args: {
    size: 'large',
    tiles: [
      ['道题', 5],
      ['次独立完成', 3],
      ['次提示后完成', 2],
    ],
  },
} satisfies Meta<typeof StatTiles>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {};
export const Small: Story = {
  args: {
    size: 'small',
    tiles: [
      ['独立完成', '0 次'],
      ['提示后完成', '1 次'],
      ['提示记录', '2 次'],
      ['确认答错', '1 次'],
      ['无法判定', '0 次'],
    ],
  },
};
