import { useMutation } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { ChildRegistrationReceipt, type ChildRegistration } from '@education/contracts';
const uncertain =
  '暂时无法确认结果。请保留当前输入，稍后再点一次“加入家庭”；重复提交不会创建第二个账号。';
async function register(input: ChildRegistration): Promise<ChildRegistrationReceipt> {
  let response: Response;
  try {
    response = await fetch('/api/v1/children/register', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Education-Request': 'child-registration' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(uncertain);
  }
  if (!response.ok) {
    if ([400, 409].includes(response.status)) {
      const data: unknown = await response.json().catch(() => undefined);
      if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      )
        throw new Error(data.message);
    }
    if (response.status === 429) throw new Error('尝试有些多，请休息一会儿再来；不用重新注册。');
    throw new Error(uncertain);
  }
  const data: unknown = await response.json().catch(() => undefined);
  if (!Value.Check(ChildRegistrationReceipt, data)) throw new Error(uncertain);
  return data;
}
export function useChildRegistration() {
  return useMutation({ mutationFn: register, retry: false, gcTime: 0 });
}
