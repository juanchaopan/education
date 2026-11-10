import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { PracticePage, type AssignPractice } from '@education/contracts';
import { sessionRequest } from './session-request';

export const practiceQueryKey = ['practice'];
const parentPath = (id: string) => `parents/children/${encodeURIComponent(id)}/practice`;

// One page of practice: a child's own when no child is named, otherwise the
// named child's as the parent sees it.
function practicePage(csrf: string, offset: number, childId?: string) {
  return {
    queryKey: [...practiceQueryKey, csrf, childId ?? 'self', offset],
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const path = childId ? parentPath(childId) : 'children/practice';
      const message = '暂时无法查看练习安排，请重试。';
      const response = await sessionRequest(`${path}?offset=${offset}`, undefined, csrf).catch(
        () => {
          throw new Error(message);
        },
      );
      if (response.status === 401 || response.status === 403)
        throw new Error('登录状态已更新，请刷新页面。');
      if (!response.ok) throw new Error(message);
      const data: unknown = await response.json().catch(() => null);
      if (!Value.Check(PracticePage, data)) throw new Error(message);
      return data;
    },
  };
}

export function usePractice(csrf: string, offset: number, childId?: string) {
  return useQuery(practicePage(csrf, offset, childId));
}

// The first page of practice of each named child, one query per child.
export function useChildrenPractice(csrf: string, childIds: readonly string[]) {
  return useQueries({ queries: childIds.map((childId) => practicePage(csrf, 0, childId)) });
}

export type PracticeAssignment = { childId: string; problem: AssignPractice };

export function useAssignPractice(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async ({ childId, problem }: PracticeAssignment) => {
      const message = '暂时无法确认安排结果，可以重试。';
      const response = await sessionRequest(parentPath(childId), problem, csrf).catch(() => {
        throw new Error(message);
      });
      if (response.status === 409) {
        void client.invalidateQueries({ queryKey: ['catalog'] });
        throw new Error('这道题的这个版本暂时不可安排，请重新选题。');
      }
      if (response.status !== 204) throw new Error(message);
    },
    onSuccess: (_, { childId }) =>
      client.invalidateQueries({ queryKey: [...practiceQueryKey, csrf, childId] }),
  });
}
