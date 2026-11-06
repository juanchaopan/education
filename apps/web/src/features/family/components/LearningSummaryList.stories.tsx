import type { Meta, StoryObj } from '@storybook/react-vite';
import { LearningSummaryList } from './LearningSummaryList';

const meta = {
  title: 'Family/LearningSummary',
  component: LearningSummaryList,
  args: {
    problems: [
      {
        id: 'storybook-pattern',
        title: '辨认规律',
        version: 1,
        independent: 0,
        assisted: 1,
        hints: 2,
        incorrect: 3,
        uncertain: 1,
        reviewSuggested: true,
      },
    ],
  },
} satisfies Meta<typeof LearningSummaryList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithEvidence: Story = {};
export const Empty: Story = { args: { problems: [] } };
