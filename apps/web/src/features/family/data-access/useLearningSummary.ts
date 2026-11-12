import { useQuery } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyOverview, LearningSummary } from '@education/contracts';
import { sessionRequest } from './session-request';

const key = 'parent-learning-summary';
const unavailable = '暂时无法查看学习摘要，请重试。';

async function readLearning(path: string) {
  const response = await sessionRequest(path).catch(() => {
    throw new Error(unavailable);
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (response.status === 404) throw new Error('没有找到这位孩子，请刷新孩子列表。');
  if (!response.ok) throw new Error(unavailable);
  return response.json().catch(() => null) as Promise<unknown>;
}

async function readSummary(childId: string, offset: number) {
  const data = await readLearning(
    `parents/children/${encodeURIComponent(childId)}/learning-summary?offset=${offset}`,
  );
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

async function readOverview() {
  const data = await readLearning('parents/overview');
  if (!Value.Check(FamilyOverview, data)) throw new Error(unavailable);
  return data;
}

// Every child's record as the overview shows it, added up by the server in
// one request. The overview reads it afresh whenever it opens.
export function useFamilyOverview(csrf: string) {
  return useQuery({
    queryKey: [key, 'overview', csrf],
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: readOverview,
  });
}
