import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
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
      {
        key: 'one',
        title: '一道测试用的题',
        detail: '小米 · 答错 1 次',
        action: (
          <Button variant="secondary">
            <Icon name="plus" />
            安排
          </Button>
        ),
      },
      {
        key: 'two',
        title: '一道标题很长很长、要在窄屏上换行的测试用题目，看看会不会挤到按钮',
        detail: '一个很长很长的昵称 · 答错 3 次',
        action: <span role="status">已安排</span>,
      },
    ],
  },
} satisfies Meta<typeof ProblemRows>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ReviewIdeas: Story = {};
export const Planned: Story = {
  args: { icon: 'calendar', rows: [{ key: 'one', title: '一道测试用的题', detail: '小米' }] },
};
