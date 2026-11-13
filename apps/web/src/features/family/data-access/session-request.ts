import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

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

// What a failed read tells the person: a message for each status that has its
// own, and `failed` for every other failure, an answer of the wrong shape
// included.
export type ReadMessages = { failed: string } & Readonly<Record<number, string>>;

// Reads data of the given schema under the browser's session, or throws the
// message for why it could not.
export async function sessionRead<Schema extends TSchema>(
  path: string,
  schema: Schema,
  messages: ReadMessages,
  csrf?: string,
): Promise<Static<Schema>> {
  const response = await sessionRequest(path, undefined, csrf).catch(() => {
    throw new Error(messages.failed);
  });
  if (!response.ok) throw new Error(messages[response.status] ?? messages.failed);
  const data: unknown = await response.json().catch(() => null);
  if (!Value.Check(schema, data)) throw new Error(messages.failed);
  return data;
}
