import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { AiConsentView, type AiConsentChange } from '@education/contracts';
import { sessionRequest } from './session-request';

async function request(csrf: string, change?: AiConsentChange): Promise<AiConsentView> {
  const fallback = '暂时无法确认 AI 授权状态，请刷新后重试。';
  const response = await sessionRequest('parents/ai-consent', change, csrf).catch(() => {
    throw new Error(fallback);
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (response.status === 403) throw new Error('请刷新授权状态并确认家长密码。');
  if (response.status === 409) throw new Error('政策或授权状态已更新，请查看最新状态后再确认。');
  if (!response.ok) throw new Error(fallback);
  const data: unknown = await response.json().catch(() => null);
  if (!Value.Check(AiConsentView, data)) throw new Error(fallback);
  return data;
}

export function useAiConsent(csrf: string) {
  const client = useQueryClient();
  const queryKey = ['parent-ai-consent', csrf];
  const status = useQuery({ queryKey, queryFn: () => request(csrf), retry: false, gcTime: 0 });
  const change = useMutation({
    mutationFn: (decision: AiConsentChange) => request(csrf, decision),
    retry: false,
    gcTime: 0,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey, exact: true });
    },
  });
  return { status, change };
}
