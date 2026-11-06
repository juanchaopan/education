import { clearFamilyManagement } from './family-cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { ChildSession, type ChildLogin } from '@education/contracts';
import { sessionRequest } from './session-request';

const key = ['child-session'];
async function request(path: string, body?: object, csrf?: string) {
  try {
    return await sessionRequest(`children/${path}`, body, csrf);
  } catch {
    throw new Error('连接中断了，稍后再试一次。');
  }
}
async function read(response: Response): Promise<ChildSession> {
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: '请检查家庭码、昵称和六位数字 PIN，再试一次。',
      401: '家庭码、昵称或 PIN 不正确，或登录已失效。请检查后重试，也可以请家长帮忙。',
      403: '请刷新页面后再试一次。',
      429: '尝试有点多，休息一会儿再试，也可以请家长帮忙。',
    };
    throw new Error(messages[response.status] ?? '暂时无法连接登录服务，稍后再试一次。');
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error('暂时无法确认登录，请刷新重试。');
  }
  if (!Value.Check(ChildSession, value)) throw new Error('暂时无法确认登录，请刷新重试。');
  return value;
}
export function useChildSession() {
  return useQuery({
    queryKey: key,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await request('session');
      return response.status === 401 ? null : read(response);
    },
  });
}
export function useChildLogin() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (input: ChildLogin) => read(await request('login', input)),
    onSuccess: async (session) => {
      await client.cancelQueries({ queryKey: ['parent-session'] });
      client.setQueryData(['parent-session'], null);
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, session);
      await clearFamilyManagement(client);
    },
  });
}
export function useChildLogout() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (csrf: string) => {
      const response = await request('logout', {}, csrf);
      if (response.status !== 204) {
        await read(response);
        throw new Error('暂时无法确认退出，请重试。');
      }
    },
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, null);
      await clearFamilyManagement(client);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
