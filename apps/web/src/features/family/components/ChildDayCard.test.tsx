import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { addDays, type ProblemOutcome, type StudyDay } from '@education/contracts';
import { ChildDayCard, type ChildDayCardProps } from './ChildDayCard';

const today = '2026-11-12';

function day(date: string, minutes: number, ids: ProblemOutcome[] = []): StudyDay {
  return {
    date,
    seconds: minutes * 60,
    problems: { independent: 0, assisted: 0, open: 0 },
    ids,
  };
}

// 五 六 日 一 二 三 今: garden is tried on two days, so it counts once.
const days = [
  day('2026-11-06', 22, [['garden', 'open']]),
  day('2026-11-07', 0),
  day('2026-11-08', 38, [['trains', 'assisted']]),
  day('2026-11-09', 16),
  day('2026-11-10', 18),
  day('2026-11-11', 30, [['pattern', 'open']]),
  day(today, 12, [['garden', 'independent']]),
];

function card(props: Partial<ChildDayCardProps> = {}) {
  const handlers = { onBack: vi.fn(), onForward: vi.fn(), onPick: vi.fn(), onRetry: vi.fn() };
  render(
    <MemoryRouter>
      <ChildDayCard
        childId="mi"
        nickname="小米"
        place={0}
        today={today}
        days={days}
        canGoBack
        canGoForward={false}
        record="/family/learning?child=mi"
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  );
  return handlers;
}

const region = () => screen.getByRole('region', { name: '小米' });

it('shows the minutes and the problems of the seven days, each problem once', () => {
  card();
  const columns = within(region()).getAllByRole('button', { pressed: false });
  expect(columns.map((column) => column.textContent)).toEqual([
    '五',
    '六',
    '日',
    '一',
    '二',
    '三',
    '今',
  ]);
  expect(columns[0]).toHaveAccessibleName('11 月 6 日 22 分钟');
  expect(region()).toHaveTextContent('11月6日 – 今天已学 136 分钟');
  expect(region()).toHaveTextContent('3 道题：独立完成 1 道提示后完成 1 道还没做出来 1 道');
  expect(screen.getByRole('link', { name: '看学习记录' })).toHaveAttribute(
    'href',
    '/family/learning?child=mi',
  );
});

it('shows only the picked day, and passes a press on any column on', async () => {
  const { onPick } = card({ picked: '2026-11-07' });
  expect(screen.getByRole('button', { name: '11 月 7 日 0 分钟' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(region()).toHaveTextContent('2026年11月7日已学 0 分钟');
  expect(region()).toHaveTextContent('这一天没有做题');
  await userEvent.click(screen.getByRole('button', { name: '11 月 7 日 0 分钟' }));
  await userEvent.click(screen.getByRole('button', { name: '今天 11 月 12 日 12 分钟' }));
  expect(onPick.mock.calls).toEqual([['2026-11-07'], [today]]);
});

it('names a stretch that ends before today by its last day, and offers to come forward', async () => {
  const earlier = days.map((shown) => ({ ...shown, date: addDays(shown.date, -1) }));
  const { onForward } = card({ days: earlier, canGoForward: true });
  expect(region()).toHaveTextContent('11月5日 – 11月11日已学');
  await userEvent.click(screen.getByRole('button', { name: '往后看一天' }));
  expect(onForward).toHaveBeenCalledOnce();
});

it('says when none of the days shown has any study, and keeps the rest of the card', () => {
  card({ days: days.map((shown) => ({ ...shown, seconds: 0, ids: [] })) });
  expect(region()).toHaveTextContent('这几天没有学习');
  expect(region()).toHaveTextContent('没有做题');
  expect(screen.getByRole('link', { name: '看学习记录' })).toBeVisible();
});

it('moves back with the round button or a swipe, and not past the first day', async () => {
  const { onBack } = card();
  await userEvent.click(screen.getByRole('button', { name: '往前看一天' }));
  const columns = within(region()).getAllByRole('button')[1]!.parentElement!;
  fireEvent.pointerDown(columns, { pointerType: 'touch', clientX: 100 });
  fireEvent.pointerUp(columns, { pointerType: 'touch', clientX: 200 });
  expect(onBack).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: '往后看一天' })).toBeNull();
});

it('keeps the first day shown when there is nothing earlier', () => {
  card({ canGoBack: false });
  expect(screen.getByRole('button', { name: '往前看一天' })).toBeDisabled();
});

it('shows shapes in place of the days while they are read', () => {
  card({ days: undefined });
  expect(screen.getByRole('status')).toHaveTextContent('正在读取小米的学习记录…');
});

it('offers to read the days again after a failure', async () => {
  const { onRetry } = card({ days: undefined, failed: true });
  expect(screen.getByRole('alert')).toHaveTextContent('学习记录没有读出来。');
  await userEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(onRetry).toHaveBeenCalledOnce();
});
