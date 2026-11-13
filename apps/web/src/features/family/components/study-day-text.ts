import { weekday, type CalendarDate } from '@education/contracts';

const weekdays = '日一二三四五六';

const parts = (date: CalendarDate) => {
  const [year, month, day] = date.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
};

// Whole minutes, rounded down, as the parent space shows study time.
export const minutesOf = (seconds: number) => Math.floor(seconds / 60);

// The label under a day's column: 「今」 for today, else its weekday.
export const columnLabel = (date: CalendarDate, today: CalendarDate) =>
  date === today ? '今' : weekdays[weekday(date)]!;

export const weekdayName = (date: CalendarDate) => `周${weekdays[weekday(date)]}`;

// 11月6日
export function shortDate(date: CalendarDate) {
  const { month, day } = parts(date);
  return `${month}月${day}日`;
}

// 2026年11月12日
export function longDate(date: CalendarDate) {
  const { year, month, day } = parts(date);
  return `${year}年${month}月${day}日`;
}

// 11月6日 – 今天, or 11月5日 – 11月11日.
export const rangeName = (from: CalendarDate, to: CalendarDate, today: CalendarDate) =>
  `${shortDate(from)} – ${to === today ? '今天' : shortDate(to)}`;

// What a screen reader hears for a day's column: 11 月 5 日 12 分钟, with 今天
// first for today, which the column marks with 「今」 only to the eye.
export function spokenDay(date: CalendarDate, seconds: number, today: CalendarDate) {
  const { month, day } = parts(date);
  const spoken = `${month} 月 ${day} 日 ${minutesOf(seconds)} 分钟`;
  return date === today ? `今天 ${spoken}` : spoken;
}

// A long stretch of study time: 6 小时 20 分, or 45 分钟 under an hour.
export function durationName(seconds: number) {
  const minutes = minutesOf(seconds);
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
