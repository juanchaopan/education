import { DraftCommand, DraftResponse, draftBodyLimit } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import type { Drawing } from '../drawing/ink';
import { requestLearning, type LearningScope } from './learning-request';

export type DraftScope = LearningScope;
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
  const response = await requestLearning(
    scope,
    'draft',
    command ? encodeCommand(command) : undefined,
    cancel,
  );
  const conflict = response.status === 409 && !!command;
  if (!response.ok && !conflict) throw new Error('暂时连不上草稿，请重试。');
  const result: unknown = await response.json();
  if (!Value.Check(DraftResponse, result)) throw new Error('暂时无法确认草稿，请重试。');
  return { conflict, draft: result.draft };
}
