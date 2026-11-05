import { sessionRequest } from './session-request';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import {
  VerificationStatus,
  VerificationResult,
  type VerificationAction,
} from '@education/contracts';

async function request(path: string, body?: object, csrf?: string) {
  let response: Response;
  try {
    response = await sessionRequest(`parents/verification${path}`, body, csrf, 20000);
  } catch {
    throw new Error('连接中断，发送结果可能尚未确定。请先刷新状态并检查收件箱。');
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 400)
      throw new Error('验证链接已失效或已使用。请登录家长账号，重新发送验证邮件。');
    if (response.status === 401) throw new Error('登录状态已失效，请重新登录。');
    if (response.status === 429)
      throw new Error('发送较频繁，请至少等 60 秒再试；达到每日上限时，请明天再来。');
    if (response.status === 409) throw new Error('发送状态已变化，请刷新状态后再试。');
    throw new Error('暂时无法完成邮箱验证，请稍后再试。');
  }
  return result;
}
export function useVerification(csrf: string) {
  return useQuery({
    queryKey: ['parent-verification', csrf],
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const result = await request('');
      if (!Value.Check(VerificationStatus, result))
        throw new Error('无法确认发送状态，请稍后刷新。');
      return result;
    },
  });
}
export function useSendVerification(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (action: VerificationAction['action']) => {
      const result = await request('', { action }, csrf);
      if (!Value.Check(VerificationStatus, result))
        throw new Error('无法确认发送状态，请刷新后检查收件箱。');
      return result;
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['parent-verification'] });
    },
  });
}
export function useConfirmVerification() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (token: string) => {
      const result = await request('/confirm', { token });
      if (!Value.Check(VerificationResult, result))
        throw new Error('暂时无法确认验证结果，请重新登录查看账号状态。');
      return result;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['parent-session'] });
    },
  });
}
