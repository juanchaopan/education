import { releasePattern } from './release-pattern';

// The release the deployment serves now, from its version file. The file is
// never taken from a cache. A reply that fails or names no release is an
// error, so it is retried later and never mistaken for a new release.
export async function requestRelease(cancel?: AbortSignal) {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch('/version.json', {
    cache: 'no-store',
    signal: cancel ? AbortSignal.any([cancel, timeout]) : timeout,
  });
  if (!response.ok) throw new Error('The version file did not arrive');
  const body: unknown = await response.json();
  const revision = (body as { revision?: unknown } | null)?.revision;
  if (typeof revision !== 'string' || !releasePattern.test(revision))
    throw new Error('The version file names no release');
  return revision;
}
