// A request to the API under the browser's session. A request with a body is
// a write: it is sent as JSON with the session request header, by POST unless
// another method is named, such as PUT to give a child a book and DELETE to
// take it back.
export function sessionRequest(
  path: string,
  body?: object,
  csrf?: string,
  timeout = 10000,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
) {
  return fetch(`/api/v1/${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
    ...(body && { method, body: JSON.stringify(body) }),
    headers: {
      ...(body && { 'Content-Type': 'application/json', 'X-Education-Request': 'session' }),
      ...(csrf && { 'X-CSRF-Token': csrf }),
    },
  });
}
