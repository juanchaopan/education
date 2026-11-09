import { useEffect, useRef, useState } from 'react';
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageReadiness, type Readiness } from '../../shared/lib/reload-readiness';
import { ownRelease } from './own-release';
import { requestRelease } from './release-request';
import { createReloadGuard, type ReloadGuard } from './reload-guard';

const minute = 60_000;
const releaseQuery = ['release'] as const;

// A failed or unreadable check is tried again after a minute, then after twice
// as long each time, up to a quarter of an hour.
export function retryDelay(failures: number) {
  return Math.min(minute * 2 ** failures, 15 * minute);
}

// Where the page stands with the release the deployment serves: it is that
// release; it waits for its film to finish, for what it shows only once to
// go, or for its work to be saved; its work did not save, so it waits for a
// save to succeed; it is reloading; or it may not reload on its own for that
// release, having done so once already, and waits for the child to try again.
export type UpdatePhase = 'current' | 'waiting' | 'held' | 'reloading' | 'stuck';

type Standing = { own?: string; latest?: string; readiness: Readiness; tried: boolean };

export function phaseOf({ own, latest, readiness, tried }: Standing): UpdatePhase {
  if (!own || !latest || latest === own) return 'current';
  if (tried) return 'stuck';
  if (readiness === 'ready') return 'reloading';
  return readiness === 'unsaved' ? 'held' : 'waiting';
}

// The release the deployment serves, checked every minute while the page is
// visible, and at once when the page shows again, gets focus or comes back
// online. A page built without a release never checks.
function useLatestRelease(own: string | undefined) {
  const check = useQuery({
    queryKey: releaseQuery,
    queryFn: ({ signal }) => requestRelease(signal),
    enabled: Boolean(own),
    staleTime: 0,
    refetchInterval: minute,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: true,
    retryDelay,
  });
  const { refetch } = check;
  useEffect(() => {
    if (!own) return;
    const checkNow = () => void refetch({ cancelRefetch: false });
    window.addEventListener('focus', checkNow);
    return () => window.removeEventListener('focus', checkNow);
  }, [own, refetch]);
  return check;
}

// How the page stands toward a reload: what its parts report, and any write
// still on its way to the server, whose answer a reload would lose, counted
// as work being saved.
function useReadiness() {
  const page = usePageReadiness();
  const writing = useIsMutating() > 0;
  const readiness: Readiness = page.readiness === 'ready' && writing ? 'saving' : page.readiness;
  return { readiness, saveUnsaved: page.saveUnsaved };
}

// Checks the deployment again now, for a page that met a sign of a new
// release, such as a lesson file that is no longer there.
export function useReleaseCheck() {
  const client = useQueryClient();
  return () => void client.refetchQueries({ queryKey: releaseQuery });
}

type Options = { own?: string; guard?: ReloadGuard; reload?: () => void };

const sessionGuard = createReloadGuard();

// Brings an open page to the release the deployment serves. Once a newer
// release is out, the page waits for its film to finish, for what it shows
// only once to go, for its writes to arrive and for its work to be saved,
// saving unsaved work again after each check, and then reloads fully, once
// for each release; signing in survives the reload. The page's own release
// and the record of earlier reloads are read as the page loads, so the
// reload this page starts never counts against it. A tab that cannot keep
// the record never reloads on its own; when the child asks for another try
// it reloads even so, once nothing on the page holds the reload.
export function useReleaseUpdate({
  own: built,
  guard = sessionGuard,
  reload = () => window.location.reload(),
}: Options = {}) {
  const [own] = useState(() => built ?? ownRelease());
  const check = useLatestRelease(own);
  const page = useReadiness();
  const latest = check.data;
  const [record] = useState(() => guard.read());
  const [retried, setRetried] = useState<string>();
  const phase = phaseOf({
    own,
    latest,
    readiness: page.readiness,
    tried: retried !== latest && (!record.recordable || record.reloadedFor === latest),
  });

  const savedAfter = useRef<number>(undefined);
  useEffect(() => {
    if (phase !== 'held' || savedAfter.current === check.dataUpdatedAt) return;
    savedAfter.current = check.dataUpdatedAt;
    page.saveUnsaved();
  });

  const left = useRef<string>(undefined);
  useEffect(() => {
    if (phase !== 'reloading' || !latest || left.current === latest) return;
    left.current = latest;
    guard.mark(latest);
    reload();
  });

  return {
    phase,
    retry() {
      setRetried(latest);
      void check.refetch({ cancelRefetch: false });
    },
  };
}
