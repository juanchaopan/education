import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { ParentSession } from '@education/contracts';
import { sessionRequest } from './session-request';
import { replaceParentSession } from './family-cache';

async function confirmPassword(password: string, csrf: string): Promise<ParentSession> {
  let response: Response;
  try {
    response = await sessionRequest('parents/reauthenticate', { password }, csrf);
  } catch {
    throw new Error('连接中断，请刷新状态后重新确认家长密码。');
  }
  if (response.status === 401) throw new Error('密码不正确，或登录状态已失效，请重新登录。');
  if (response.status === 403) throw new Error('请刷新状态后重新确认家长密码。');
  if (response.status === 429) throw new Error('密码确认次数较多，请稍后再试。');
  if (!response.ok) throw new Error('暂时无法确认家长密码，请稍后重试。');
  const value: unknown = await response.json().catch(() => null);
  if (!Value.Check(ParentSession, value)) throw new Error('暂时无法确认登录状态，请刷新页面。');
  return value;
}

export function useParentReauthentication(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: (password: string) => confirmPassword(password, csrf),
    onSuccess: (session) => replaceParentSession(client, session),
  });
}
