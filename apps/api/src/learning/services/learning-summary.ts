import {
  learningSummaryPageSize,
  type LearningSummary,
  type ProblemLearningSummary,
} from '@education/contracts';
import { reviewSuggested } from '../domain/review.js';
import type { LearningEvidence } from '../repositories/postgres-learning-summary.js';

export type Title = (problemId: string, version: number) => string | undefined;

// A problem version that has left the catalog keeps its record with no title.
export function withTitle<T extends { id: string; version: number }>(problem: T, title: Title) {
  return { ...problem, title: title(problem.id, problem.version) ?? null };
}

// One version's record as the parent sees it. Whether it is worth another
// try is decided for the whole problem, so every version of it agrees.
export function summarizeProblem(
  { problem, ...row }: LearningEvidence,
  title: Title,
): ProblemLearningSummary {
  return { ...withTitle(row, title), reviewSuggested: reviewSuggested(problem) };
}

export function createLearningSummaryService(
  read: (
    token: string | undefined,
    childId: string,
    limit: number,
    offset: number,
  ) => Promise<LearningEvidence[]>,
  title: Title,
) {
  return async (
    token: string | undefined,
    childId: string,
    offset: number,
  ): Promise<LearningSummary> => {
    const rows = await read(token, childId, learningSummaryPageSize + 1, offset);
    return {
      childId,
      hasMore: rows.length > learningSummaryPageSize,
      problems: rows.slice(0, learningSummaryPageSize).map((row) => summarizeProblem(row, title)),
    };
  };
}

export type LearningSummaryService = ReturnType<typeof createLearningSummaryService>;
