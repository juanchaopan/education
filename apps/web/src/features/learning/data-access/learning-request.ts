import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export type LearningScope = Readonly<{ id: string; version: number; csrf: string }>;
type Resource = 'draft' | 'answer' | 'feedback' | 'question' | 'transcription';

export function requestLearning(
  scope: LearningScope,
  resource: Resource,
  body?: string,
  cancel?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(10000);
  return fetch(`/api/v1/problems/${encodeURIComponent(scope.id)}/${scope.version}/${resource}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal: cancel ? AbortSignal.any([cancel, timeout]) : timeout,
    body,
    headers: {
      'X-CSRF-Token': scope.csrf,
      ...(body ? { 'Content-Type': 'application/json', 'X-Education-Request': 'session' } : {}),
    },
  });
}

// Posts to a step resource and returns the reply only when it matches the
// shared schema, so the page never acts on a reply it cannot trust.
export async function postLearning<R extends TSchema>(
  scope: LearningScope,
  resource: Resource,
  body: string,
  reply: R,
  cancel?: AbortSignal,
): Promise<Static<R>> {
  const response = await requestLearning(scope, resource, body, cancel);
  if (!response.ok) throw new Error('暂时连不上，请重试。');
  const payload: unknown = await response.json();
  if (!Value.Check(reply, payload)) throw new Error('暂时无法读懂回复，请重试。');
  return payload;
}
