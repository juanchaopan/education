import { learningSummaryPageSize, type LearningSummary } from '@education/contracts';
import type { LearningEvidence } from '../repositories/postgres-learning-summary.js';

export function createLearningSummaryService(
  read: (
    token: string | undefined,
    childId: string,
    limit: number,
    offset: number,
  ) => Promise<LearningEvidence[]>,
  title: (problemId: string, version: number) => string | undefined,
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
      problems: rows.slice(0, learningSummaryPageSize).map((row) => ({
        ...row,
        title: title(row.id, row.version) ?? null,
        reviewSuggested: row.incorrect >= 2 && row.independent === 0,
      })),
    };
  };
}

export type LearningSummaryService = ReturnType<typeof createLearningSummaryService>;
