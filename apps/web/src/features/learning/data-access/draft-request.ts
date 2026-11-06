import { DraftCommand, DraftResponse, draftBodyLimit } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import type { Drawing } from '../drawing/ink';

export type DraftScope = { id: string; version: number; csrf: string };
export type LocalDraft = Readonly<{ stepId: string; drawing: Drawing }>;
export type DraftWrite =
  | { action: 'save'; revision: string | null; content: LocalDraft }
  | { action: 'discard'; revision: string | null };
export class DraftSizeError extends Error {}

function encodeCommand(command: DraftWrite) {
  const body = JSON.stringify(command);
  if (!Value.Check(DraftCommand, command) || new TextEncoder().encode(body).length > draftBodyLimit)
    throw new DraftSizeError('这份草稿还没同步。可以撤销几笔，再试一次。');
  return body;
}

export async function requestDraft(scope: DraftScope, command?: DraftWrite, cancel?: AbortSignal) {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(
    `/api/v1/problems/${encodeURIComponent(scope.id)}/${scope.version}/draft`,
    {
      method: command ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: cancel ? AbortSignal.any([cancel, timeout]) : timeout,
      body: command ? encodeCommand(command) : undefined,
      headers: {
        'X-CSRF-Token': scope.csrf,
        ...(command
          ? { 'Content-Type': 'application/json', 'X-Education-Request': 'session' }
          : {}),
      },
    },
  );
  const conflict = response.status === 409 && !!command;
  if (!response.ok && !conflict) throw new Error('暂时连不上草稿，请重试。');
  const result: unknown = await response.json();
  if (!Value.Check(DraftResponse, result)) throw new Error('暂时无法确认草稿，请重试。');
  return { conflict, draft: result.draft };
}
