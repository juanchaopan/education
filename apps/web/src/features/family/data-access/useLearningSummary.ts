import { useQuery } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { LearningSummary } from '@education/contracts';
import { sessionRequest } from './session-request';

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
    queryKey: ['parent-learning-summary', csrf, childId, offset],
    retry: false,
    gcTime: 0,
    queryFn: () => readSummary(childId, offset),
  });
}
