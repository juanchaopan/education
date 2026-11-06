import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { PracticePage, type AssignPractice } from '@education/contracts';
import { sessionRequest } from './session-request';

export const practiceQueryKey = ['practice'];
const parentPath = (id: string) => `parents/children/${encodeURIComponent(id)}/practice`;

export function usePractice(csrf: string, offset: number, childId?: string) {
  return useQuery({
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
  });
}

export function useAssignPractice(csrf: string, childId: string) {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (problem: AssignPractice) => {
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
    onSuccess: () => client.invalidateQueries({ queryKey: [...practiceQueryKey, csrf, childId] }),
  });
}
