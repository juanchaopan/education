import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LearningRange } from '@education/contracts';
import { LearningRangeCard } from './LearningRangeCard';

const today = '2026-11-12';
// Test fixtures only: these problems never enter the problem list.
const day: LearningRange = {
  from: today,
  to: today,
  seconds: 720,
  problems: { independent: 1, assisted: 0, open: 1 },
  items: [
    {
      id: 'fixture-one',
      version: 1,
      title: '测试用的第一道题',
      state: 'independent',
      attempts: 2,
      hints: 0,
    },
    {
      id: 'fixture-two',
      version: 1,
      title: '测试用的第二道题',
      state: 'open',
      attempts: 3,
      hints: 2,
    },
  ],
  total: { problems: 38, seconds: 22_800 },
};

const meta = {
  title: '家长空间/这段时间的学习',
  component: LearningRangeCard,
  args: {
    from: today,
    to: today,
    today,
    range: day,
    onRetry: () => {},
    onSevenDays: () => {},
  },
} satisfies Meta<typeof LearningRangeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneDay: Story = {};
export const SevenDays: Story = {
  args: {
    from: '2026-11-06',
    range: {
      ...day,
      from: '2026-11-06',
      seconds: 8760,
      problems: { independent: 6, assisted: 2, open: 1 },
      items: [
        ...day.items,
        {
          id: 'fixture-three',
          version: 2,
          title: '测试用的第三道题，题目的名字写得比较长',
          state: 'assisted',
          attempts: 4,
          hints: 3,
        },
      ],
    },
  },
};
export const QuietDay: Story = {
  args: {
    range: { ...day, seconds: 0, problems: { independent: 0, assisted: 0, open: 0 }, items: [] },
  },
};
export const Reading: Story = { args: { range: undefined, loading: true } };
export const NotRead: Story = { args: { range: undefined, failed: true } };
