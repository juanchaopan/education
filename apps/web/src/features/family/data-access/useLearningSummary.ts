import { useQuery } from '@tanstack/react-query';
import { FamilyOverview, LearningSummary } from '@education/contracts';
import { sessionRead } from './session-request';

const key = 'parent-learning-summary';
const unavailable = '暂时无法查看学习摘要，请重试。';
const reading = { failed: unavailable, 401: '登录状态已失效，请重新登录家长账号。' };

async function readSummary(childId: string, offset: number) {
  const data = await sessionRead(
    `parents/children/${encodeURIComponent(childId)}/learning-summary?offset=${offset}`,
    LearningSummary,
    { ...reading, 404: '没有找到这位孩子，请刷新孩子列表。' },
  );
  if (data.childId !== childId) throw new Error(unavailable);
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

// Every child's record as the overview shows it, added up by the server in
// one request. The overview reads it afresh whenever it opens.
export function useFamilyOverview(csrf: string) {
  return useQuery({
    queryKey: [key, 'overview', csrf],
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: () => sessionRead('parents/overview', FamilyOverview, reading),
  });
}
