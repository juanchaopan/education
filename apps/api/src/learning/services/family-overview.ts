import {
  addDays,
  addUpDays,
  localDate,
  startOfDay,
  type CalendarDate,
  type FamilyOverview,
  type LearningRange,
  type LearningRangeItem,
  type ProblemState,
  type ReviewIdea,
  type StudyDay,
  type StudyDays,
} from '@education/contracts';
import { problemTotals, reviewSuggested } from '../domain/review.js';
import {
  blockEnding,
  blockIssue,
  rangeIssue,
  stateOfRank,
  studyDays,
} from '../domain/study-days.js';
import type {
  FamilyLearning,
  ProblemEvidence,
  RangeRow,
} from '../repositories/postgres-family-overview.js';
import { RequestError } from '../../shared/request-error.js';
import { withTitle, type Title } from './learning-summary.js';

// The problem catalogue as the parent space reads it: the title of a version
// the child tried, or nothing for one it no longer lists, and the current
// version of a problem with its title.
type Latest = (id: string) => { version: number; title: string } | undefined;
export type Catalogue = { title: Title; latest: Latest };

type WithFamily = <T>(
  token: string | undefined,
  work: (family: FamilyLearning) => Promise<T>,
) => Promise<T>;

// The problems worth another try, each once, judged over every version the
// child tried with the wrong answers on all of them added up. Each opens at
// the problem's current version, the one the books give; a problem the
// catalogue no longer lists has nothing to open, so it is not suggested.
function reviewIdeas(problems: readonly ProblemEvidence[], latest: Latest): ReviewIdea[] {
  return [...problemTotals(problems)].flatMap(([id, total]) => {
    const current = reviewSuggested(total) ? latest(id) : undefined;
    return current
      ? [{ id, version: current.version, title: current.title, incorrect: total.incorrect }]
      : [];
  });
}

// A stretch of the family's days with the instants it starts and ends at,
// found with the zone's rules so a day the clocks change on keeps its 23 or
// 25 hours.
const stretch = (timeZone: string, from: CalendarDate, to: CalendarDate) => ({
  from,
  to,
  window: { start: startOfDay(timeZone, from), end: startOfDay(timeZone, addDays(to, 1)) },
});

// Each child's days over a stretch, every day with its seconds and the state
// each problem reached on it.
async function daysOf(
  family: FamilyLearning,
  timeZone: string,
  childIds: readonly string[],
  from: CalendarDate,
  to: CalendarDate,
): Promise<Map<string, StudyDay[]>> {
  const facts = await family.dayFacts(childIds, timeZone, stretch(timeZone, from, to));
  return new Map(childIds.map((childId) => [childId, studyDays(from, to, facts.get(childId)!)]));
}

const stateOrder: Record<ProblemState, number> = { independent: 0, assisted: 1, open: 2 };

// The problems of a stretch of the record: finished alone first, then after
// help, then not finished yet, and by title within each.
function rangeItems(rows: readonly RangeRow[], title: Title): LearningRangeItem[] {
  return rows
    .map(({ id, version, rank, attempts, hints }) =>
      withTitle({ id, version, state: stateOfRank(rank), attempts, hints }, title),
    )
    .sort(
      (a, b) =>
        stateOrder[a.state] - stateOrder[b.state] ||
        (a.title ?? a.id).localeCompare(b.title ?? b.id, 'zh-CN'),
    );
}

async function familyToday(family: FamilyLearning, now: Date) {
  const timeZone = await family.timeZone();
  return { timeZone, today: localDate(timeZone, now) };
}

// The family's zone for days of one of its children that the request names,
// once the days make sense and the child is the family's.
async function childDaysAsked(
  family: FamilyLearning,
  childId: string,
  now: Date,
  issueOf: (today: CalendarDate) => string | undefined,
) {
  const { timeZone, today } = await familyToday(family, now);
  const issue = issueOf(today);
  if (issue) throw new RequestError(400, issue);
  if (!(await family.hasChild(childId)))
    throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
  return timeZone;
}

// Every child with the block of days ending today, the first day with any
// record, and the problems worth another try.
async function overviewOf(
  family: FamilyLearning,
  latest: Latest,
  now: Date,
): Promise<FamilyOverview> {
  const { timeZone, today } = await familyToday(family, now);
  const evidence = await family.evidence();
  const ids = evidence.map(({ childId }) => childId);
  const days = await daysOf(family, timeZone, ids, blockEnding(today).from, today);
  const earliest = await family.earliest(ids, timeZone);
  return {
    timeZone,
    today,
    children: evidence.map(({ childId, problems }) => ({
      id: childId,
      days: days.get(childId)!,
      earliest: earliest.get(childId) ?? null,
      review: reviewIdeas(problems, latest),
    })),
  };
}

// One child's block of days ending on an earlier day.
async function blockOf(
  family: FamilyLearning,
  childId: string,
  end: string,
  now: Date,
): Promise<StudyDays> {
  const timeZone = await childDaysAsked(family, childId, now, (today) => blockIssue(end, today));
  const days = await daysOf(family, timeZone, [childId], blockEnding(end).from, end);
  return { days: days.get(childId)! };
}

// One child's learning over one to seven days, and the whole record's totals.
// The figures add up the same days the card shows, so the two agree.
async function rangeOf(
  family: FamilyLearning,
  { childId, from, to }: { childId: string; from: string; to: string },
  title: Title,
  now: Date,
): Promise<LearningRange> {
  const timeZone = await childDaysAsked(family, childId, now, (today) =>
    rangeIssue(from, to, today),
  );
  const days = await daysOf(family, timeZone, [childId], from, to);
  const rows = await family.rangeRows(childId, stretch(timeZone, from, to).window);
  return {
    from,
    to,
    ...addUpDays(days.get(childId)!),
    items: rangeItems(rows, title),
    total: await family.totals(childId),
  };
}

// What the parent space reads of a family's learning, always in one
// transaction for the signed-in parent's own family, on the days of the
// family's time zone.
export function createFamilyOverviewService(
  withFamily: WithFamily,
  { title, latest }: Catalogue,
  now = () => new Date(),
) {
  return {
    overview: (token: string | undefined) =>
      withFamily(token, (family) => overviewOf(family, latest, now())),
    days: (token: string | undefined, childId: string, end: string) =>
      withFamily(token, (family) => blockOf(family, childId, end, now())),
    range: (token: string | undefined, childId: string, from: string, to: string) =>
      withFamily(token, (family) => rangeOf(family, { childId, from, to }, title, now())),
  };
}

export type FamilyOverviewService = ReturnType<typeof createFamilyOverviewService>;
