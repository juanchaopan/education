export function sessionRequest(path: string, body?: object, csrf?: string, timeout = 10000) {
  return fetch(`/api/v1/${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
    ...(body
      ? {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            'X-Education-Request': 'session',
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
        }
      : {}),
  });
}
