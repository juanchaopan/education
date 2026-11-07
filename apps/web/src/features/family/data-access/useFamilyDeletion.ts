import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { familyDeletionPhrase, FamilyDeletionResult } from '@education/contracts';
import { replaceParentSession } from './family-cache';
import { sessionRequest } from './session-request';

type Deletion = { csrf: string; confirmation: string };

const unsure = '暂时无法确认删除结果，请稍后重新登录查看；如果还能登录，说明家庭没有删除。';

// The server explains why it could not accept a deletion, including when the
// outcome is unsure. Without that explanation, as from a gateway in front of
// it, the deletion may still have happened, so the parent is told so.
async function serverMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : unsure;
}

async function deleteFamily({ csrf, confirmation }: Deletion) {
  const response = await sessionRequest(
    'parents/family-deletion',
    { confirmation },
    csrf,
    15_000,
  ).catch(() => {
    throw new Error(unsure);
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (response.status === 403) throw new Error('请重新确认家长密码后再删除。');
  if (response.status === 422) throw new Error(`请输入“${familyDeletionPhrase}”确认删除。`);
  if (!response.ok) throw new Error(await serverMessage(response));
  const value: unknown = await response.json().catch(() => null);
  if (!Value.Check(FamilyDeletionResult, value)) throw new Error(unsure);
  return value.status;
}

// A finished deletion reports itself, then signs this browser out, since the
// session and every family view it held no longer exist. The report runs first
// because signing out unmounts whatever started the deletion. A failed
// deletion rechecks the session, which may have ended meanwhile.
export function useFamilyDeletion(onDeleted: () => void) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: deleteFamily,
    onSuccess: async (status) => {
      if (status !== 'deleted') return;
      onDeleted();
      await replaceParentSession(client, null);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['parent-session'] });
    },
  });
}
