import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { GeneratedRegistrationKey, RegistrationKeyStatus } from '@education/contracts';
import { sessionRequest } from './session-request';
import type { TSchema, Static } from '@sinclair/typebox';

async function request(path: string, body?: object, csrf?: string) {
  let response: Response;
  try {
    response = await sessionRequest(path, body, csrf);
  } catch {
    throw new Error('连接中断，请先刷新状态。若生成结果未显示，可重新生成并撤销旧 KEY。');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('密码不正确，或登录状态已失效，请重新登录。');
    if (response.status === 403) throw new Error('请刷新状态并重新验证家长密码。');
    if (response.status === 429)
      throw new Error('操作次数较多，请稍后再试；已有 KEY 仍可在有效期内使用。');
    if (response.status === 404) throw new Error('没有可撤销的 KEY，请刷新状态。');
    throw new Error('暂时无法完成，请稍后刷新状态。');
  }
  return response;
}
async function read<T extends TSchema>(response: Response, schema: T): Promise<Static<T>> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('暂时无法确认结果，请刷新状态。');
  }
  if (!Value.Check(schema, data)) throw new Error('暂时无法确认结果，请刷新状态。');
  return data;
}
const key = ['parent-registration-key'];
export function useRegistrationKey(csrf: string) {
  return useQuery({
    queryKey: [...key, csrf],
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: async () => read(await request('parents/registration-keys'), RegistrationKeyStatus),
  });
}
export function useManageRegistrationKey(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (action: { type: 'generate' } | { type: 'revoke'; id: string }) => {
      if (action.type === 'generate')
        return read(await request('parents/registration-keys', {}, csrf), GeneratedRegistrationKey);
      await request('parents/registration-keys/revoke', { id: action.id }, csrf);
      return null;
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
