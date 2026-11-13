import type { ChildOverview, FamilyOverview, ReviewIdea } from '@education/contracts';
import { reviewSuggested } from '../domain/review.js';
import type { ChildEvidence, ProblemEvidence } from '../repositories/postgres-family-overview.js';
import type { Title } from './learning-summary.js';

const sum = (problems: readonly ProblemEvidence[], count: (problem: ProblemEvidence) => number) =>
  problems.reduce((total, problem) => total + count(problem), 0);

// A version the catalogue no longer lists has nothing to open, so it is not
// suggested.
function reviewIdea(problem: ProblemEvidence, title: Title): ReviewIdea[] {
  if (!reviewSuggested(problem)) return [];
  const name = title(problem.id, problem.version);
  return name === undefined
    ? []
    : [{ id: problem.id, version: problem.version, title: name, incorrect: problem.incorrect }];
}

// A problem counts once however many of its versions the child has tried;
// answers finished after help never count as finished alone.
export function overviewOf({ childId, problems }: ChildEvidence, title: Title): ChildOverview {
  return {
    id: childId,
    total: {
      problems: new Set(problems.map(({ id }) => id)).size,
      independent: sum(problems, ({ independent }) => independent),
      assisted: sum(problems, ({ assisted }) => assisted),
    },
    review: problems.flatMap((problem) => reviewIdea(problem, title)),
  };
}

// Every child of the parent's family with the record behind the overview,
// read in one go so the page needs a single request.
export function createFamilyOverviewService(
  read: (token: string | undefined) => Promise<ChildEvidence[]>,
  title: Title,
) {
  return async (token: string | undefined): Promise<FamilyOverview> => ({
    children: (await read(token)).map((child) => overviewOf(child, title)),
  });
}

export type FamilyOverviewService = ReturnType<typeof createFamilyOverviewService>;
