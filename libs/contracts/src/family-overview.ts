import { Type, type Static } from '@sinclair/typebox';
import { CalendarDate, TimeZoneName } from './calendar.js';
import { ProblemId, ProblemSummary, ProblemVersion } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });

// The days the overview sends at once, ending today, and each block of earlier
// days read as the parent moves back; the card shows seven of them at a time.
export const studyDaysBlock = 28;
export const shownDays = 7;
// The longest stretch of days the learning record shows at once.
export const learningRangeLongest = 7;

// What became of a problem over some days, counted once whatever its
// versions: finished alone at least once; else finished after help at least
// once; else answered or helped with but not finished yet.
export const ProblemState = Type.Union([
  Type.Literal('independent'),
  Type.Literal('assisted'),
  Type.Literal('open'),
]);
export const ProblemCounts = Type.Object(
  { independent: count, assisted: count, open: count },
  closed,
);
export const ProblemOutcome = Type.Tuple([ProblemId, ProblemState]);

// One day of the family's time zone for one child: the seconds studied, the
// problems in each state, and each problem's state, so several days can be
// added up without counting a problem twice.
export const StudyDay = Type.Object(
  {
    date: CalendarDate,
    seconds: count,
    problems: ProblemCounts,
    ids: Type.Array(ProblemOutcome),
  },
  closed,
);

// A problem the child answered wrongly and has not yet finished alone, as the
// learning summary marks it for review. Versions the catalogue no longer lists
// are left out, since there is nothing to show for them.
export const ReviewIdea = Type.Object(
  {
    id: ProblemSummary.properties.id,
    version: ProblemSummary.properties.version,
    title: ProblemSummary.properties.title,
    incorrect: count,
  },
  closed,
);

export const ChildOverview = Type.Object(
  {
    id: ChildAccess.properties.id,
    // Today and the days before it, the earliest first.
    days: Type.Array(StudyDay, { minItems: studyDaysBlock, maxItems: studyDaysBlock }),
    // The first day with an answer, a hint or study time; null for none yet.
    earliest: Type.Union([CalendarDate, Type.Null()]),
    review: Type.Array(ReviewIdea),
  },
  closed,
);

// What the parent overview shows of every child in the family, read at once,
// with the family's time zone and its today.
export const FamilyOverview = Type.Object(
  { timeZone: TimeZoneName, today: CalendarDate, children: Type.Array(ChildOverview) },
  closed,
);

export const ChildParams = Type.Object({ childId: ChildAccess.properties.id }, closed);
export const StudyDaysQuery = Type.Object({ to: CalendarDate }, closed);
export const StudyDays = Type.Object(
  { days: Type.Array(StudyDay, { minItems: studyDaysBlock, maxItems: studyDaysBlock }) },
  closed,
);

export const LearningRangeQuery = Type.Object({ from: CalendarDate, to: CalendarDate }, closed);
export const LearningRangeItem = Type.Object(
  {
    id: ProblemId,
    version: ProblemVersion,
    title: Type.Union([ProblemSummary.properties.title, Type.Null()]),
    state: ProblemState,
    attempts: count,
    hints: count,
  },
  closed,
);
// A child's learning from one day to another, and the whole record's totals.
export const LearningRange = Type.Object(
  {
    from: CalendarDate,
    to: CalendarDate,
    seconds: count,
    problems: ProblemCounts,
    items: Type.Array(LearningRangeItem),
    total: Type.Object({ problems: count, seconds: count }, closed),
  },
  closed,
);

export type ProblemState = Static<typeof ProblemState>;
export type ProblemCounts = Static<typeof ProblemCounts>;
export type ProblemOutcome = Static<typeof ProblemOutcome>;
export type StudyDay = Static<typeof StudyDay>;
export type ReviewIdea = Static<typeof ReviewIdea>;
export type ChildOverview = Static<typeof ChildOverview>;
export type FamilyOverview = Static<typeof FamilyOverview>;
export type ChildParams = Static<typeof ChildParams>;
export type StudyDaysQuery = Static<typeof StudyDaysQuery>;
export type StudyDays = Static<typeof StudyDays>;
export type LearningRangeQuery = Static<typeof LearningRangeQuery>;
export type LearningRangeItem = Static<typeof LearningRangeItem>;
export type LearningRange = Static<typeof LearningRange>;

const rank: Record<ProblemState, number> = { open: 0, assisted: 1, independent: 2 };

// The better of two states: finished alone beats finished after help, which
// beats not finished yet.
export const betterState = (a: ProblemState, b: ProblemState) => (rank[a] >= rank[b] ? a : b);

// Each problem's best state over every outcome given, such as those of
// several days.
export function bestStates(outcomes: Iterable<ProblemOutcome>) {
  const states = new Map<string, ProblemState>();
  for (const [id, state] of outcomes) {
    const known = states.get(id);
    states.set(id, known ? betterState(known, state) : state);
  }
  return states;
}

export function countStates(states: Iterable<ProblemState>): ProblemCounts {
  const counts = { independent: 0, assisted: 0, open: 0 };
  for (const state of states) counts[state] += 1;
  return counts;
}

// The problems of several days, each counted once in its best state, and the
// seconds studied over them.
export function addUpDays(days: readonly StudyDay[]) {
  return {
    seconds: days.reduce((sum, day) => sum + day.seconds, 0),
    problems: countStates(bestStates(days.flatMap((day) => day.ids)).values()),
  };
}
