import { useQueries, useQuery } from '@tanstack/react-query';
import {
  FamilyOverview,
  LearningRange,
  LearningSummary,
  StudyDays,
  type CalendarDate,
} from '@education/contracts';
import { sessionRead } from './session-request';

const key = 'parent-learning-summary';
const unavailable = '暂时无法查看学习记录，请重试。';
const reading = { failed: unavailable, 401: '登录状态已失效，请重新登录家长账号。' };
// A view of one child, which names the child when it is no longer there.
const childReading = { ...reading, 404: '没有找到这位孩子，请刷新孩子列表。' };

const childPath = (childId: string, view: string, query: Record<string, string>) =>
  `parents/children/${encodeURIComponent(childId)}/${view}?${new URLSearchParams(query)}`;

export function useLearningSummary(csrf: string, childId: string, offset: number) {
  return useQuery({
    queryKey: [key, csrf, childId, offset],
    retry: false,
    gcTime: 0,
    queryFn: async () => {
      const data = await sessionRead(
        childPath(childId, 'learning-summary', { offset: String(offset) }),
        LearningSummary,
        childReading,
      );
      if (data.childId !== childId) throw new Error(unavailable);
      return data;
    },
  });
}

// Every child's days ending today, added up by the server in one request. The
// overview reads it afresh whenever it opens, and again whenever the family's
// children it shows change, so a child who just joined gets days too.
export function useFamilyOverview(csrf: string, childIds: readonly string[]) {
  return useQuery({
    queryKey: [key, 'overview', csrf, [...childIds].sort()],
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: () => sessionRead('parents/overview', FamilyOverview, reading),
  });
}

// The earlier blocks of one child's days, each ending on one of `ends`. A
// block of past days does not change while the overview is open, so each is
// read once and kept as the parent moves back and forth.
export function useEarlierDays(csrf: string, childId: string, ends: readonly CalendarDate[]) {
  return useQueries({
    queries: ends.map((to) => ({
      queryKey: [key, 'days', csrf, childId, to],
      retry: false,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      queryFn: () => sessionRead(childPath(childId, 'days', { to }), StudyDays, childReading),
    })),
  });
}

// One child's learning from one day to another, and the whole record's totals.
export function useLearningRange(
  csrf: string,
  childId: string,
  from: CalendarDate,
  to: CalendarDate,
) {
  return useQuery({
    queryKey: [key, 'range', csrf, childId, from, to],
    retry: false,
    queryFn: () =>
      sessionRead(childPath(childId, 'learning', { from, to }), LearningRange, childReading),
  });
}
