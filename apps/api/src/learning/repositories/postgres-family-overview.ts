import type pg from 'pg';
import type { CalendarDate, ProblemOutcome } from '@education/contracts';
import { stateOfRank, type DayFacts } from '../domain/study-days.js';
import type { LearningEvidence } from './postgres-learning-summary.js';
import { triedProblems } from './tried-problems.js';

export type ProblemEvidence = Pick<
  LearningEvidence,
  'id' | 'version' | 'independent' | 'assisted' | 'incorrect'
>;
export type ChildEvidence = { childId: string; problems: ProblemEvidence[] };

// The instants a stretch of local days starts and ends at, the end excluded.
export type Window = { start: Date; end: Date };

export type RangeRow = {
  id: string;
  version: number;
  rank: number;
  attempts: number;
  hints: number;
};

type EvidenceRow = Omit<ProblemEvidence, 'id' | 'version'> & {
  child_id: string;
  id: string | null;
  version: string | null;
};

// Each child of a family, in the order of the family's child list, with every
// problem version the child answered or asked for help on. A child without
// any record comes back with no problems.
async function readFamilyEvidence(client: pg.PoolClient, familyId: string) {
  const { rows } = await client.query<EvidenceRow>(
    `WITH family AS (SELECT id,nickname FROM children WHERE family_id=$1),
    tried AS (${triedProblems('family')})
    SELECT family.id AS child_id,tried.problem_id AS id,tried.problem_version AS version,
      coalesce(p.independent,0) AS independent,coalesce(p.assisted,0) AS assisted,
      coalesce(p.incorrect,0) AS incorrect
    FROM family
    LEFT JOIN tried ON tried.child_id=family.id
    LEFT JOIN progress p ON p.child_id=family.id
      AND p.problem_id=tried.problem_id AND p.problem_version=tried.problem_version
    ORDER BY family.nickname,family.id,tried.problem_id,tried.problem_version`,
    [familyId],
  );
  const children = new Map<string, ProblemEvidence[]>();
  for (const { child_id, id, version, ...counts } of rows) {
    const problems = children.get(child_id) ?? [];
    children.set(child_id, problems);
    if (id !== null && version !== null) problems.push({ id, version: Number(version), ...counts });
  }
  return [...children].map(([childId, problems]): ChildEvidence => ({ childId, problems }));
}

// Each answer and hint of the given children in a window, with the rank its
// result gives the problem: 2 finished alone, 1 after help, 0 not finished.
// An answer that could not be judged did not finish the problem.
const events = `
  SELECT child_id,problem_id,problem_version,submitted_at AS at,'attempt' AS kind,
    CASE outcome WHEN 'independent' THEN 2 WHEN 'assisted' THEN 1 ELSE 0 END AS rank
  FROM attempts WHERE child_id=ANY($1::uuid[]) AND submitted_at>=$2 AND submitted_at<$3
  UNION ALL
  SELECT child_id,problem_id,problem_version,requested_at,'hint',0
  FROM help_events WHERE child_id=ANY($1::uuid[]) AND requested_at>=$2 AND requested_at<$3`;

function grouped<T>(rows: readonly T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return groups;
}

type OutcomeRow = { child_id: string; date: string; id: string; rank: number };
type SecondsRow = { child_id: string; date: string; seconds: number };

function factsOf(outcomes: readonly OutcomeRow[], seconds: readonly SecondsRow[]): DayFacts {
  return {
    seconds: new Map(seconds.map((row) => [row.date, row.seconds])),
    outcomes: new Map(
      [...grouped(outcomes, (row) => row.date)].map(([date, rows]) => [
        date,
        rows.map((row): ProblemOutcome => [row.id, stateOfRank(row.rank)]),
      ]),
    ),
  };
}

// Each child's seconds and problem states day by day over a stretch of days.
async function readDayFacts(
  client: pg.PoolClient,
  childIds: readonly string[],
  timeZone: string,
  days: { from: CalendarDate; to: CalendarDate; window: Window },
) {
  const outcomes = await client.query<OutcomeRow>(
    `SELECT child_id,to_char((at AT TIME ZONE $4)::date,'YYYY-MM-DD') AS date,
      problem_id AS id,max(rank)::int AS rank
    FROM (${events}) e GROUP BY 1,2,3`,
    [childIds, days.window.start, days.window.end, timeZone],
  );
  const seconds = await client.query<SecondsRow>(
    `SELECT child_id,to_char(day,'YYYY-MM-DD') AS date,seconds FROM study_days
    WHERE child_id=ANY($1::uuid[]) AND day BETWEEN $2 AND $3`,
    [childIds, days.from, days.to],
  );
  const byOutcomes = grouped(outcomes.rows, (row) => row.child_id);
  const bySeconds = grouped(seconds.rows, (row) => row.child_id);
  return new Map(
    childIds.map((childId) => [
      childId,
      factsOf(byOutcomes.get(childId) ?? [], bySeconds.get(childId) ?? []),
    ]),
  );
}

// The first local day each child answered, asked for help or studied.
async function readEarliest(client: pg.PoolClient, childIds: readonly string[], timeZone: string) {
  const { rows } = await client.query<{ child_id: string; earliest: string | null }>(
    `SELECT c.id AS child_id,to_char(least(
      ((SELECT min(submitted_at) FROM attempts WHERE child_id=c.id) AT TIME ZONE $2)::date,
      ((SELECT min(requested_at) FROM help_events WHERE child_id=c.id) AT TIME ZONE $2)::date,
      (SELECT min(day) FROM study_days WHERE child_id=c.id AND seconds>0)
    ),'YYYY-MM-DD') AS earliest
    FROM unnest($1::uuid[]) AS c(id)`,
    [childIds, timeZone],
  );
  return new Map(rows.map((row) => [row.child_id, row.earliest]));
}

// Each problem one child answered or asked for help on in a window, with its
// latest version tried, its best rank and how often each happened.
async function readRangeRows(client: pg.PoolClient, childId: string, window: Window) {
  const { rows } = await client.query<RangeRow>(
    `SELECT problem_id AS id,max(problem_version)::int AS version,max(rank)::int AS rank,
      (count(*) FILTER (WHERE kind='attempt'))::int AS attempts,
      (count(*) FILTER (WHERE kind='hint'))::int AS hints
    FROM (${events}) e GROUP BY problem_id`,
    [[childId], window.start, window.end],
  );
  return rows;
}

// The whole record: the problems ever tried, counted once whatever their
// versions, and every second studied.
async function readTotals(client: pg.PoolClient, childId: string) {
  const { rows } = await client.query<{ problems: number; seconds: number }>(
    `SELECT (SELECT count(*) FROM (
        SELECT problem_id FROM attempts WHERE child_id=$1
        UNION SELECT problem_id FROM help_events WHERE child_id=$1
      ) tried)::int AS problems,
      (SELECT coalesce(sum(seconds),0) FROM study_days WHERE child_id=$1)::int AS seconds`,
    [childId],
  );
  return rows[0]!;
}

async function readTimeZone(client: pg.PoolClient, familyId: string, defaultTimeZone: string) {
  const { rows } = await client.query<{ zone: string }>(
    'SELECT coalesce(time_zone,$2) AS zone FROM families WHERE id=$1',
    [familyId, defaultTimeZone],
  );
  return rows[0]?.zone ?? defaultTimeZone;
}

async function inFamily(client: pg.PoolClient, familyId: string, childId: string) {
  const found = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
    childId,
    familyId,
  ]);
  return found.rowCount === 1;
}

// What a parent reads of their own family's learning, inside the caller's
// transaction. Days are those of the family's time zone, or of the
// deployment's default zone while the family has none.
export function familyLearningFor(
  client: pg.PoolClient,
  familyId: string,
  defaultTimeZone: string,
) {
  return {
    timeZone: () => readTimeZone(client, familyId, defaultTimeZone),
    evidence: () => readFamilyEvidence(client, familyId),
    hasChild: (childId: string) => inFamily(client, familyId, childId),
    dayFacts: (
      childIds: readonly string[],
      timeZone: string,
      days: { from: CalendarDate; to: CalendarDate; window: Window },
    ) => readDayFacts(client, childIds, timeZone, days),
    earliest: (childIds: readonly string[], timeZone: string) =>
      readEarliest(client, childIds, timeZone),
    rangeRows: (childId: string, window: Window) => readRangeRows(client, childId, window),
    totals: (childId: string) => readTotals(client, childId),
  };
}

export type FamilyLearning = ReturnType<typeof familyLearningFor>;
