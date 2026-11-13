import {
  addDays,
  countStates,
  daysBetween,
  isCalendarDate,
  learningRangeLongest,
  studyDaysBlock,
  type CalendarDate,
  type ProblemOutcome,
  type ProblemState,
  type StudyDay,
} from '@education/contracts';

// The rank the database gives an answer or a hint: 2 finished alone, 1
// finished after help, 0 anything that did not finish the problem.
const states: readonly ProblemState[] = ['open', 'assisted', 'independent'];
export const stateOfRank = (rank: number): ProblemState => states[rank] ?? 'open';

// The block of days that ends on a day, as the overview and each step back
// read them.
export const blockEnding = (to: CalendarDate) => ({
  from: addDays(to, 1 - studyDaysBlock),
  to,
});

export type DayFacts = {
  seconds: ReadonlyMap<CalendarDate, number>;
  outcomes: ReadonlyMap<CalendarDate, readonly ProblemOutcome[]>;
};

// Every day from one date to another, the earliest first, with the seconds
// studied and the problems answered or helped with that day. A day without
// either is there too, empty.
export function studyDays(from: CalendarDate, to: CalendarDate, facts: DayFacts): StudyDay[] {
  const days: StudyDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const ids = [...(facts.outcomes.get(date) ?? [])].sort(([a], [b]) => a.localeCompare(b));
    days.push({
      date,
      seconds: facts.seconds.get(date) ?? 0,
      problems: countStates(ids.map(([, state]) => state)),
      ids,
    });
  }
  return days;
}

// Why a day cannot end a block of days: it is not a real date or it is still
// to come.
export function blockIssue(to: string, today: CalendarDate) {
  if (!isCalendarDate(to)) return '日期不对，请刷新页面。';
  if (to > today) return '还没有到这一天。';
  return undefined;
}

// Why some days cannot be shown as one stretch of the learning record.
export function rangeIssue(from: string, to: string, today: CalendarDate) {
  const issue = blockIssue(from, today) ?? blockIssue(to, today);
  if (issue) return issue;
  const span = daysBetween(from, to);
  if (span < 0) return '开始的日子不能晚于结束的日子。';
  if (span >= learningRangeLongest) return `一次最多看 ${learningRangeLongest} 天。`;
  return undefined;
}
