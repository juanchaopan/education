import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyChildren, type ChildAccessReset } from '@education/contracts';
import { sessionRequest } from './session-request';

const key = ['parent-children'];
async function request(body?: ChildAccessReset, csrf?: string) {
  let response: Response;
  try {
    response = await sessionRequest(`parents/children${body ? '/reset-pin' : ''}`, body, csrf);
  } catch {
    throw new Error('连接中断，结果尚不确定。请刷新孩子状态，再决定是否需要重置。');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: '请设置与旧 PIN 不同、不全相同、也不连续的六位数字 PIN。',
      401: '登录状态已失效，请重新登录家长账号。',
      403: '请刷新孩子状态，并重新确认家长密码。',
      404: '没有找到这个孩子，请刷新孩子状态。',
      409: '孩子的 PIN 已有更新，本次没有再次修改。请刷新孩子状态。',
      429: '操作次数较多，请稍后再试。孩子现有账号和学习记录不受影响。',
    };
    throw new Error(messages[response.status] ?? '暂时无法确认结果，请刷新孩子状态后重试。');
  }
  return response;
}
export function useFamilyChildren(csrf: string) {
  return useQuery({
    queryKey: [...key, csrf],
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: async () => {
      const response = await request();
      const data: unknown = await response.json().catch(() => {
        throw new Error('暂时无法确认孩子状态，请刷新重试。');
      });
      if (!Value.Check(FamilyChildren, data)) throw new Error('暂时无法确认孩子状态，请刷新重试。');
      return data;
    },
  });
}
export function useResetChildAccess(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (input: ChildAccessReset) => {
      const response = await request(input, csrf);
      if (response.status !== 204) throw new Error('结果尚不确定，请刷新孩子状态后确认。');
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
