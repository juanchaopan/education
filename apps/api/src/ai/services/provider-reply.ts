export type JsonObject = Record<string, unknown>;

// Provider replies are untrusted; anything that is not a plain object reads as empty.
export function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

export function isSuccessful(response: Response, mime: string) {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  return response.ok && type === mime;
}

// An authentication or permission rejection happens before the provider does
// any billable work, so the reservation is released.
export function rejectedBeforeWork(status: number) {
  return status === 401 || status === 403;
}
