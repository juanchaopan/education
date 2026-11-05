import { sessionRequest } from './session-request';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { ParentSession, type ParentLogin } from '@education/contracts';

const key = ['parent-session'];
async function request(path: string, body?: object, csrf?: string) {
  try {
    return await sessionRequest(path, body, csrf);
  } catch {
    throw new Error('连接中断，请稍后重试。');
  }
}
async function read(response: Response): Promise<ParentSession> {
  if (!response.ok) {
    if (response.status === 401) throw new Error('邮箱或密码不正确，或登录状态已失效。');
    if (response.status === 429) throw new Error('尝试较多，请稍后再试。');
    if (response.status === 403) throw new Error('请刷新页面后重试。');
    throw new Error('暂时无法连接登录服务，请稍后重试。');
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('暂时无法确认登录状态，请刷新重试。');
  }
  if (!Value.Check(ParentSession, data)) throw new Error('暂时无法确认登录状态，请刷新重试。');
  return data;
}
export function useParentSession() {
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
export function useParentLogin() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (input: ParentLogin) => read(await request('parents/login', input)),
    onSuccess: async (session) => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, session);
    },
  });
}
export function useParentLogout() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (csrf: string) => {
      const response = await request('parents/logout', {}, csrf);
      if (response.status !== 204) {
        await read(response);
        throw new Error('暂时无法确认退出结果，请重试。');
      }
    },
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, null);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
