import type pg from 'pg';
import type { ProblemLearningSummary } from '@education/contracts';
import type { Page } from './page.js';
import { triedProblems } from './tried-problems.js';

export type LearningEvidence = Omit<ProblemLearningSummary, 'title' | 'reviewSuggested'>;

// Without a page, every problem the child has evidence for is read.
export async function readLearningEvidence(
  client: pg.PoolClient,
  childId: string,
  page?: Page,
): Promise<LearningEvidence[]> {
  const { rows } = await client.query<
    Omit<LearningEvidence, 'version' | 'hints'> & {
      version: string;
      hints: string;
    }
  >(
    `WITH problem_page AS (
      ${triedProblems('=$1')}
      ORDER BY problem_id,problem_version LIMIT $2 OFFSET $3
    )
    SELECT page.problem_id AS id,page.problem_version AS version,
      coalesce(p.independent,0) AS independent,coalesce(p.assisted,0) AS assisted,
      coalesce(p.incorrect,0) AS incorrect,coalesce(p.uncertain,0) AS uncertain,
      (SELECT count(*) FROM help_events h WHERE h.child_id=$1
        AND h.problem_id=page.problem_id AND h.problem_version=page.problem_version) AS hints
    FROM problem_page page
    LEFT JOIN progress p ON p.child_id=$1
      AND p.problem_id=page.problem_id AND p.problem_version=page.problem_version
    ORDER BY page.problem_id,page.problem_version`,
    [childId, page?.limit ?? null, page?.offset ?? 0],
  );
  return rows.map((row) => ({ ...row, version: Number(row.version), hints: Number(row.hints) }));
}
