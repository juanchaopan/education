import type pg from 'pg';
import type { LearningEvidence } from './postgres-learning-summary.js';
import { triedProblems } from './tried-problems.js';

export type ProblemEvidence = Pick<
  LearningEvidence,
  'id' | 'version' | 'independent' | 'assisted' | 'incorrect'
>;
export type ChildEvidence = { childId: string; problems: ProblemEvidence[] };

type Row = Omit<ProblemEvidence, 'id' | 'version'> & {
  child_id: string;
  id: string | null;
  version: string | null;
};

// Each child of a family, in the order of the family's child list, with every
// problem version the child answered or asked for help on. A child without
// any record comes back with no problems.
export async function readFamilyEvidence(
  client: pg.PoolClient,
  familyId: string,
): Promise<ChildEvidence[]> {
  const { rows } = await client.query<Row>(
    `WITH family AS (SELECT id,nickname FROM children WHERE family_id=$1),
    tried AS (${triedProblems('IN (SELECT id FROM family)')})
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
  return [...children].map(([childId, problems]) => ({ childId, problems }));
}
