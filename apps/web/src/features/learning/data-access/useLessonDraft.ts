import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SavedDraft } from '@education/contracts';
import { useReloadReadiness, type Readiness } from '../../../shared/lib/reload-readiness';
import {
  DraftSizeError,
  requestDraft,
  type DraftScope,
  type DraftWrite,
  type LocalDraft,
} from './draft-request';

type DraftState = {
  scope: DraftScope;
  base?: SavedDraft | null;
  local?: LocalDraft;
  conflict?: { draft: SavedDraft | null };
  busy?: boolean;
  // The command that last failed, so it can be sent again as it was.
  failed?: DraftWrite['action'];
  message?: string;
};

export type DraftStatus =
  'loading' | 'load-failed' | 'clean' | 'saved' | 'unsynced' | 'saving' | 'conflict';

function statusFor(
  base: SavedDraft | null | undefined,
  state: DraftState,
  loadFailed: boolean,
): DraftStatus {
  if (base === undefined) return loadFailed ? 'load-failed' : 'loading';
  if (state.conflict) return 'conflict';
  if (state.busy) return 'saving';
  if (state.local || state.failed) return 'unsynced';
  return base ? 'saved' : 'clean';
}

// What a reload would do to the draft: an edit not yet saved, a discard not
// yet sent, or an edit kept through a conflict until the child chooses, would
// be lost.
function readinessOf(status: DraftStatus): Readiness {
  if (status === 'unsynced' || status === 'conflict') return 'unsaved';
  return status === 'saving' ? 'saving' : 'ready';
}

// The draft last saved for this scope, fetched once as the lesson opens.
function useSavedDraft(scope: DraftScope) {
  return useQuery({
    queryKey: ['lesson-draft', scope],
    queryFn: ({ signal }) => requestDraft(scope, undefined, signal),
    networkMode: 'always',
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useLessonDraft({ id, version, csrf }: DraftScope, initial: LocalDraft) {
  const scope = useMemo(() => ({ id, version, csrf }), [id, version, csrf]);
  const load = useSavedDraft(scope);
  const [stored, setStored] = useState<DraftState>({ scope });
  const state = stored.scope === scope ? stored : { scope };
  if (stored.scope !== scope) setStored(state);
  const base = state.base === undefined ? load.data?.draft : state.base;
  const content = state.local ?? base?.content ?? initial;
  const status = statusFor(base, state, load.isError);

  function update(change: (current: DraftState) => DraftState) {
    setStored((current) => (current.scope === scope ? change(current) : current));
  }

  const send = useDraftCommand(scope, update);
  // Sends the draft on screen, or `local` when the caller has just recorded it.
  function run(action: DraftWrite['action'], local?: LocalDraft) {
    if (base === undefined || state.conflict) return;
    const revision = base?.revision ?? null;
    return send(
      action === 'save' ? { action, revision, content: local ?? content } : { action, revision },
      local ?? state.local,
    );
  }
  // Before a reload the page finishes what the child last asked for: a
  // discard that failed is sent again as a discard, never as a save.
  useReloadReadiness(readinessOf(status), () => void run(state.failed ?? 'save'));

  function edit(local: LocalDraft) {
    if (base !== undefined)
      update((current) => ({ ...current, local, failed: undefined, message: undefined }));
  }

  function resolve(choice: 'keep' | 'remote') {
    update((current) =>
      current.conflict
        ? {
            scope,
            base: current.conflict.draft,
            local: choice === 'keep' ? (current.local ?? content) : undefined,
          }
        : current,
    );
  }

  return {
    content,
    status,
    message: state.message,
    hasDraft: Boolean(state.local || base),
    hasRemote: Boolean(state.conflict?.draft),
    edit,
    save: () => run('save'),
    // Records a new draft and saves it at once, for a lesson whose progress is
    // the step it has reached rather than an ongoing edit.
    saveAs(local: LocalDraft) {
      edit(local);
      return run('save', local);
    },
    discard: () => run('discard'),
    reload: load.refetch,
    resolve,
  };
}

function useDraftCommand(
  scope: DraftScope,
  update: (change: (state: DraftState) => DraftState) => void,
) {
  const inFlight = useRef<DraftScope | null>(null);
  return async (command: DraftWrite, sent?: LocalDraft) => {
    if (inFlight.current === scope) return;
    inFlight.current = scope;
    update((current) => ({ ...current, busy: true, failed: undefined, message: undefined }));
    try {
      const result = await requestDraft(scope, command);
      update((current) =>
        result.conflict
          ? { ...current, busy: false, conflict: result }
          : {
              scope,
              base: result.draft,
              local: current.local === sent ? undefined : current.local,
            },
      );
    } catch (error) {
      const message = error instanceof DraftSizeError ? error.message : undefined;
      update((current) => ({ ...current, busy: false, failed: command.action, message }));
    } finally {
      if (inFlight.current === scope) inFlight.current = null;
    }
  };
}
