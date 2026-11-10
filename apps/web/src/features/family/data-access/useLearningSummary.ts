import { useQueries, useQuery } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import {
  LearningSummary,
  learningSummaryPageSize,
  type ProblemLearningSummary,
} from '@education/contracts';
import { sessionRequest } from './session-request';

const key = 'parent-learning-summary';

async function readSummary(childId: string, offset: number) {
  const unavailable = '暂时无法查看学习摘要，请重试。';
  const response = await sessionRequest(
    `parents/children/${encodeURIComponent(childId)}/learning-summary?offset=${offset}`,
  ).catch(() => {
    throw new Error(unavailable);
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (response.status === 404) throw new Error('没有找到这位孩子，请刷新孩子列表。');
  if (!response.ok) throw new Error(unavailable);
  const data: unknown = await response.json().catch(() => null);
  if (!Value.Check(LearningSummary, data) || data.childId !== childId) throw new Error(unavailable);
  return data;
}

export function useLearningSummary(csrf: string, childId: string, offset: number) {
  return useQuery({
    queryKey: [key, csrf, childId, offset],
    retry: false,
    gcTime: 0,
    queryFn: () => readSummary(childId, offset),
  });
}

// Every problem a child has a record of, read page after page. A family's
// records are a handful of pages; past the last page read here the record is
// marked incomplete, so a total built from it is never shown as the whole.
const pagesRead = 10;

export type ChildRecord = {
  problems: ProblemLearningSummary[];
  complete: boolean;
};

async function readRecord(childId: string): Promise<ChildRecord> {
  const problems: ProblemLearningSummary[] = [];
  for (let page = 0; page < pagesRead; page++) {
    const summary = await readSummary(childId, page * learningSummaryPageSize);
    problems.push(...summary.problems);
    if (!summary.hasMore) return { problems, complete: true };
  }
  return { problems, complete: false };
}

// The whole record of each child, one query per child. A whole record takes
// several pages to read, so it is not read again each time the window comes
// back into focus; the overview reads it afresh whenever it opens.
export function useChildRecords(csrf: string, childIds: readonly string[]) {
  return useQueries({
    queries: childIds.map((childId) => ({
      queryKey: [key, 'record', csrf, childId],
      retry: false,
      gcTime: 0,
      refetchOnWindowFocus: false,
      queryFn: () => readRecord(childId),
    })),
  });
}
