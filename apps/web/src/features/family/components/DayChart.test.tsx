import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { addDays, type StudyDay } from '@education/contracts';
import { DayChart, type DayChartProps } from './DayChart';

const today = '2026-11-12';
const days: StudyDay[] = Array.from({ length: 7 }, (_, place) => ({
  date: addDays(today, place - 6),
  seconds: place * 60,
  problems: { independent: 0, assisted: 0, open: 0 },
  ids: [],
}));

function chart(props: Partial<DayChartProps> = {}) {
  const all: DayChartProps = {
    days,
    today,
    canGoBack: true,
    canGoForward: true,
    onBack: vi.fn(),
    onForward: vi.fn(),
    onPick: vi.fn(),
    ...props,
  };
  const view = render(<DayChart {...all} />);
  return {
    ...view,
    rerender: (more: Partial<DayChartProps>) => view.rerender(<DayChart {...all} {...more} />),
  };
}

it('names today for a screen reader as well as the eye', () => {
  chart();
  expect(screen.getByRole('button', { name: '今天 11 月 12 日 6 分钟' })).toBeVisible();
  expect(screen.getByRole('button', { name: '11 月 11 日 5 分钟' })).toBeVisible();
});

it('moves the keyboard to the back button when moving forward reaches today', async () => {
  const { rerender } = chart();
  await userEvent.click(screen.getByRole('button', { name: '往后看一天' }));
  rerender({ canGoForward: false });
  expect(screen.queryByRole('button', { name: '往后看一天' })).toBeNull();
  expect(screen.getByRole('button', { name: '往前看一天' })).toHaveFocus();
});
