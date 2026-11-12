import {
  learningSummaryPageSize,
  type LearningSummary,
  type ProblemLearningSummary,
} from '@education/contracts';
import type { LearningEvidence } from '../repositories/postgres-learning-summary.js';

export type Title = (problemId: string, version: number) => string | undefined;

// A problem version that has left the catalog keeps its record with no title.
export function withTitle<T extends { id: string; version: number }>(problem: T, title: Title) {
  return { ...problem, title: title(problem.id, problem.version) ?? null };
}

// Worth another try: answered wrongly more than once and never finished alone.
// An answer that could not be judged is not evidence of a wrong one.
export function reviewSuggested({
  incorrect,
  independent,
}: Pick<LearningEvidence, 'incorrect' | 'independent'>) {
  return incorrect >= 2 && independent === 0;
}

export function summarizeProblem(row: LearningEvidence, title: Title): ProblemLearningSummary {
  return { ...withTitle(row, title), reviewSuggested: reviewSuggested(row) };
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
