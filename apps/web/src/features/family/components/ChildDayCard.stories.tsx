import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { addDays, type ProblemOutcome, type StudyDay } from '@education/contracts';
import { ChildDayCard } from './ChildDayCard';

const today = '2026-11-12';

// A day with some minutes and the problems tried on it; test fixtures only.
function day(date: string, minutes: number, ids: ProblemOutcome[] = []): StudyDay {
  const count = (state: string) => ids.filter(([, outcome]) => outcome === state).length;
  return {
    date,
    seconds: minutes * 60,
    problems: {
      independent: count('independent'),
      assisted: count('assisted'),
      open: count('open'),
    },
    ids,
  };
}

// The seven days ending on `end`, with these minutes from the earliest: the
// last day tried the problems given, every other day with any minutes one.
const week = (end: string, minutes: readonly number[], last: ProblemOutcome[] = []) =>
  minutes.map((value, place) => {
    const tried: ProblemOutcome[] = value ? [[`fixture-${place}`, 'independent']] : [];
    return day(addDays(end, place - 6), value, place === 6 ? last : tried);
  });

const meta = {
  title: '家长空间/孩子卡片',
  component: ChildDayCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ maxInlineSize: '28rem' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    childId: '11111111-1111-4111-8111-111111111111',
    nickname: '小米',
    place: 0,
    today,
    days: week(
      today,
      [22, 0, 38, 16, 18, 30, 12],
      [
        ['fixture-a', 'independent'],
        ['fixture-b', 'assisted'],
        ['fixture-c', 'open'],
      ],
    ),
    canGoBack: true,
    canGoForward: false,
    record: '/family/learning',
    onBack: () => {},
    onForward: () => {},
    onPick: () => {},
    onRetry: () => {},
  },
} satisfies Meta<typeof ChildDayCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SevenDays: Story = {};
export const TodayPicked: Story = { args: { picked: today } };
export const QuietDayPicked: Story = { args: { picked: '2026-11-07' } };
export const OneDayBack: Story = {
  args: {
    days: week('2026-11-11', [8, 22, 0, 38, 16, 18, 30]),
    canGoForward: true,
  },
};
export const QuietDays: Story = {
  args: {
    nickname: '乐乐',
    place: 1,
    days: Array.from({ length: 7 }, (_, place) => day(addDays(today, place - 6), 0)),
  },
};
export const FirstDayShown: Story = { args: { canGoBack: false } };
export const LongNicknameAndLargeFigures: Story = {
  args: {
    nickname: '一个很长很长的昵称欧阳小米粒儿',
    days: week(
      today,
      [120, 95, 0, 210, 88, 140, 34],
      [
        ...Array.from({ length: 41 }, (_, n): ProblemOutcome => [`fixture-i${n}`, 'independent']),
        ...Array.from({ length: 23 }, (_, n): ProblemOutcome => [`fixture-a${n}`, 'assisted']),
        ...Array.from({ length: 12 }, (_, n): ProblemOutcome => [`fixture-o${n}`, 'open']),
      ],
    ),
  },
};
export const Reading: Story = { args: { days: undefined } };
export const NotRead: Story = { args: { days: undefined, failed: true } };
