import { answerBodyLimit } from '@education/contracts';
import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// What the answer and the variation of a problem share when they talk to the
// server: both send commands about a round of the problem, refused when the
// round has changed elsewhere, and both trust only replies that match the
// shared schema.

export class AnswerConflictError extends Error {}

const unconfirmed = '暂时无法确认提交结果，请重试。';

// A command as it is sent, once it matches its schema and fits the size the
// server takes.
export function encodeCommand<S extends TSchema>(schema: S, command: Static<S>) {
  const body = JSON.stringify(command);
  if (!Value.Check(schema, command) || new TextEncoder().encode(body).length > answerBodyLimit)
    throw new Error('这次作答格式有误或太长，请检查后重试。');
  return body;
}

export async function readReply<S extends TSchema>(
  request: Promise<Response>,
  schema: S,
): Promise<Static<S>> {
  const response = await request;
  if (response.status === 409)
    throw new AnswerConflictError('这一轮的提交有变化，请重新打开题目。');
  if (!response.ok) throw new Error('暂时连不上，请重试。');
  const payload: unknown = await response.json();
  if (!Value.Check(schema, payload)) throw new Error(unconfirmed);
  return payload;
}

// Sends an attempt and trusts only the receipt for that same attempt, so a
// retry after a lost reply, which sends it again as it is, is never taken
// for another.
export function confirmedAttempt<R extends { attemptId: string }>(
  attemptId: string,
  send: (cancel?: AbortSignal) => Promise<R>,
) {
  return async (cancel?: AbortSignal) => {
    const receipt = await send(cancel);
    if (receipt.attemptId !== attemptId) throw new Error(unconfirmed);
    return receipt;
  };
}
