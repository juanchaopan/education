import { useMutation, useQuery } from '@tanstack/react-query';
import type { ParentRegistration, RegistrationReceipt } from '@education/contracts';

async function register(input: ParentRegistration): Promise<RegistrationReceipt> {
  const response = await requestRegistration(input);
  if (!response.ok) {
    if (response.status === 429) throw new Error('尝试较多，请稍后再试。');
    if (response.status === 400) throw new Error('请检查邮箱和密码格式后重试。');
    throw new Error('暂时无法完成注册，请稍后重试。');
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('暂时无法确认注册结果，请稍后重试。');
  }
  if (!isReceipt(result)) throw new Error('暂时无法确认注册结果，请稍后重试。');
  return { status: result.status, mail: result.mail };
}

function isReceipt(result: unknown): result is RegistrationReceipt {
  return (
    typeof result === 'object' &&
    result !== null &&
    'status' in result &&
    result.status === 'pending-verification' &&
    'mail' in result &&
    result.mail === 'not-sent'
  );
}

async function requestRegistration(input: ParentRegistration) {
  try {
    return await fetch('/api/v1/parents/register', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Education-Request': 'registration' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('连接中断，暂时无法确认注册结果。请稍后重试，重复提交不会创建另一个家庭。');
  }
}

export function useRegistration() {
  return useMutation({ mutationFn: register, retry: false, gcTime: 0 });
}

export function useRegistrationStatus() {
  return useQuery({
    queryKey: ['registration-status'],
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/v1/registration-status', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('暂时无法连接注册服务。');
      const data: unknown = await response.json();
      if (
        typeof data !== 'object' ||
        data === null ||
        !('enabled' in data) ||
        typeof data.enabled !== 'boolean'
      )
        throw new Error('暂时无法连接注册服务。');
      return data.enabled;
    },
  });
}
