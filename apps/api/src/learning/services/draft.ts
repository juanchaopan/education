import type { DraftCommand, DraftContent, SavedDraft } from '@education/contracts';
import { RequestError } from '../../shared/request-error.js';

export type DraftProblem = { id: string; version: number };
type Credentials = { token?: string; csrf?: string };
type DraftStore = {
  current: (problem: DraftProblem) => Promise<SavedDraft | null>;
  save: (problem: DraftProblem, content: DraftContent) => Promise<SavedDraft>;
  discard: (problem: DraftProblem, revision: string) => Promise<boolean>;
};
type WithDrafts = <T>(
  credentials: Credentials,
  work: (store: DraftStore) => Promise<T>,
) => Promise<T>;

export function createDraftService(
  withDrafts: WithDrafts,
  available: (id: string, version: number) => boolean,
) {
  return (credentials: Credentials, problem: DraftProblem, command?: DraftCommand) =>
    withDrafts(credentials, async (store) => {
      if (!available(problem.id, problem.version))
        throw new RequestError(404, '这道题或这个版本暂时不可用。');
      const current = await store.current(problem);
      if (!command) return { status: 200 as const, draft: current };
      if (command.revision !== (current?.revision ?? null))
        return { status: 409 as const, draft: current };
      if (command.action === 'discard') {
        if (current) await store.discard(problem, current.revision);
        return { status: 200 as const, draft: null };
      }
      const draft = await store.save(problem, command.content);
      return { status: 200 as const, draft };
    });
}

export type DraftService = ReturnType<typeof createDraftService>;
