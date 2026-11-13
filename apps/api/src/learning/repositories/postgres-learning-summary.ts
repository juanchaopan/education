import type pg from 'pg';
import type { ProblemLearningSummary } from '@education/contracts';
import type { ReviewEvidence } from '../domain/review.js';
import type { Page } from './page.js';
import { triedProblems } from './tried-problems.js';

// One version's record, and with `problem` the counts of every version of the
// same problem the child tried, which decide whether it is worth another try.
export type LearningEvidence = Omit<ProblemLearningSummary, 'title' | 'reviewSuggested'> & {
  problem: ReviewEvidence;
};

type Row = Omit<LearningEvidence, 'version' | 'hints' | 'problem'> & {
  version: string;
  hints: string;
  problem_incorrect: string;
  problem_independent: string;
};

// Without a page, every problem the child has evidence for is read.
export async function readLearningEvidence(
  client: pg.PoolClient,
  childId: string,
  page?: Page,
): Promise<LearningEvidence[]> {
  const { rows } = await client.query<Row>(
    `WITH problem_page AS (
      ${triedProblems('$1')}
      ORDER BY problem_id,problem_version LIMIT $2 OFFSET $3
    )
    SELECT page.problem_id AS id,page.problem_version AS version,
      coalesce(p.independent,0) AS independent,coalesce(p.assisted,0) AS assisted,
      coalesce(p.incorrect,0) AS incorrect,coalesce(p.uncertain,0) AS uncertain,
      (SELECT count(*) FROM help_events h WHERE h.child_id=$1
        AND h.problem_id=page.problem_id AND h.problem_version=page.problem_version) AS hints,
      coalesce(problem.incorrect,0) AS problem_incorrect,
      coalesce(problem.independent,0) AS problem_independent
    FROM problem_page page
    LEFT JOIN progress p ON p.child_id=$1
      AND p.problem_id=page.problem_id AND p.problem_version=page.problem_version
    LEFT JOIN LATERAL (
      SELECT sum(q.incorrect) AS incorrect,sum(q.independent) AS independent
      FROM progress q WHERE q.child_id=$1 AND q.problem_id=page.problem_id
    ) problem ON true
    ORDER BY page.problem_id,page.problem_version`,
    [childId, page?.limit ?? null, page?.offset ?? 0],
  );
  return rows.map(({ problem_incorrect, problem_independent, ...row }) => ({
    ...row,
    version: Number(row.version),
    hints: Number(row.hints),
    problem: { incorrect: Number(problem_incorrect), independent: Number(problem_independent) },
  }));
}
