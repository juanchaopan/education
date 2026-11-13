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
  type StudyDays,
} from '@education/contracts';
import { reviewSuggested } from '../domain/review.js';
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

type WithFamily = <T>(
  token: string | undefined,
  work: (family: FamilyLearning) => Promise<T>,
) => Promise<T>;

// A version the catalogue no longer lists has nothing to open, so it is not
// suggested.
function reviewIdea(problem: ProblemEvidence, title: Title): ReviewIdea[] {
  if (!reviewSuggested(problem)) return [];
  const { id, version, title: name, incorrect } = withTitle(problem, title);
  return name === null ? [] : [{ id, version, title: name, incorrect }];
}

// A stretch of the family's days with the instants it starts and ends at,
// found with the zone's rules so a day the clocks change on keeps its 23 or
// 25 hours.
const stretch = (timeZone: string, from: CalendarDate, to: CalendarDate) => ({
  from,
  to,
  window: { start: startOfDay(timeZone, from), end: startOfDay(timeZone, addDays(to, 1)) },
});

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

async function requireChild(family: FamilyLearning, childId: string) {
  if (!(await family.hasChild(childId)))
    throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
}

// Every child with the block of days ending today, the first day with any
// record, and the problems worth another try.
async function overviewOf(
  family: FamilyLearning,
  title: Title,
  now: Date,
): Promise<FamilyOverview> {
  const { timeZone, today } = await familyToday(family, now);
  const evidence = await family.evidence();
  const ids = evidence.map(({ childId }) => childId);
  const days = stretch(timeZone, blockEnding(today).from, today);
  const facts = await family.dayFacts(ids, timeZone, days);
  const earliest = await family.earliest(ids, timeZone);
  return {
    timeZone,
    today,
    children: evidence.map(({ childId, problems }) => ({
      id: childId,
      days: studyDays(days.from, days.to, facts.get(childId)!),
      earliest: earliest.get(childId) ?? null,
      review: problems.flatMap((problem) => reviewIdea(problem, title)),
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
  const { timeZone, today } = await familyToday(family, now);
  const issue = blockIssue(end, today);
  if (issue) throw new RequestError(400, issue);
  await requireChild(family, childId);
  const days = stretch(timeZone, blockEnding(end).from, end);
  const facts = await family.dayFacts([childId], timeZone, days);
  return { days: studyDays(days.from, days.to, facts.get(childId)!) };
}

// One child's learning over one to seven days, and the whole record's totals.
async function rangeOf(
  family: FamilyLearning,
  request: { childId: string; from: string; to: string },
  title: Title,
  now: Date,
): Promise<LearningRange> {
  const { childId, from, to } = request;
  const { timeZone, today } = await familyToday(family, now);
  const issue = rangeIssue(from, to, today);
  if (issue) throw new RequestError(400, issue);
  await requireChild(family, childId);
  const days = stretch(timeZone, from, to);
  const facts = await family.dayFacts([childId], timeZone, days);
  return {
    from,
    to,
    ...addUpDays(studyDays(from, to, facts.get(childId)!)),
    items: rangeItems(await family.rangeRows(childId, days.window), title),
    total: await family.totals(childId),
  };
}

// What the parent space reads of a family's learning, always in one
// transaction for the signed-in parent's own family, on the days of the
// family's time zone.
export function createFamilyOverviewService(
  withFamily: WithFamily,
  title: Title,
  now = () => new Date(),
) {
  return {
    overview: (token: string | undefined) =>
      withFamily(token, (family) => overviewOf(family, title, now())),
    days: (token: string | undefined, childId: string, end: string) =>
      withFamily(token, (family) => blockOf(family, childId, end, now())),
    range: (token: string | undefined, childId: string, from: string, to: string) =>
      withFamily(token, (family) => rangeOf(family, { childId, from, to }, title, now())),
  };
}

export type FamilyOverviewService = ReturnType<typeof createFamilyOverviewService>;
