export type LearningScope = Readonly<{ id: string; version: number; csrf: string }>;

export function requestLearning(
  scope: LearningScope,
  resource: 'draft' | 'answer' | 'feedback',
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
