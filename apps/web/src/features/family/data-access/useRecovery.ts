import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import {
  RecoveryReceipt,
  PasswordResetResult,
  type RecoveryRequest,
  type PasswordReset,
} from '@education/contracts';
import { sessionRequest } from './session-request';
async function request(path: string, body: object) {
  let response: Response;
  try {
    response = await sessionRequest(`parents/recovery${path}`, body, undefined, 30000);
  } catch {
    throw new Error('连接中断，结果尚未确定。请先检查邮件或尝试用新密码登录，不要连续提交。');
  }
  if (!response.ok) {
    if (response.status === 400)
      throw new Error(
        path
          ? '恢复链接已失效、已使用或密码不符合要求，请重新检查或申请。'
          : '请检查邮箱格式后重试。',
      );
    if (response.status === 429) throw new Error('尝试较多，请至少等 60 秒再试。');
    throw new Error('暂时无法恢复密码，请稍后再试。');
  }
  return response.json().catch(() => null);
}
export function useRecoveryRequest() {
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (input: RecoveryRequest) => {
      const result: unknown = await request('', input);
      if (!Value.Check(RecoveryReceipt, result))
        throw new Error('无法确认申请结果，请先检查收件箱。');
      return result;
    },
  });
}
export function usePasswordReset() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async (input: PasswordReset) => {
      const result: unknown = await request('/confirm', input);
      if (!Value.Check(PasswordResetResult, result))
        throw new Error('无法确认修改结果，请尝试用新密码登录。');
      return result;
    },
    onSuccess: () => {
      client.removeQueries({ queryKey: ['parent-session'] });
      client.removeQueries({ queryKey: ['parent-verification'] });
    },
  });
}
