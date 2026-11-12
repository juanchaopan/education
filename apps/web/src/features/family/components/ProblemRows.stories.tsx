import type { Meta, StoryObj } from '@storybook/react-vite';
import { ParentCard } from './ParentCard';
import { ProblemRows } from './ProblemRows';

const meta = {
  title: '家长空间/题目列表',
  component: ProblemRows,
  decorators: [
    (Story) => (
      <ParentCard titleId="story-rows-title" icon="bulb" title="值得再练">
        <Story />
      </ParentCard>
    ),
  ],
  args: {
    icon: 'bulb',
    rows: [
      { key: 'one', title: '一道测试用的题', detail: '小米 · 答错 1 次' },
      {
        key: 'two',
        title: '一道标题很长很长、要在窄屏上换行的测试用题目，看看会不会挤到边上',
        detail: '一个很长很长的昵称 · 答错 3 次',
      },
    ],
  },
} satisfies Meta<typeof ProblemRows>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ReviewIdeas: Story = {};
