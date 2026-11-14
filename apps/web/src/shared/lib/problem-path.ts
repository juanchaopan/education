import { isProblemId, parseProblemVersion } from '@education/contracts';

export function problemPath(id: string, version: number) {
  return `/problems/${encodeURIComponent(id)}/${version}`;
}

// The problem a sign-in should return to: only a path to one of the site's
// problems, written exactly as problemPath writes it. Anything else, such as
// another site or another page, is ignored.
export function returnPath(next: string | null) {
  const match = next?.match(/^\/problems\/([^/?#]+)\/([^/?#]+)$/);
  if (!match) return undefined;
  const [, id = '', version = ''] = match;
  const parsed = parseProblemVersion(version);
  return isProblemId(id) && parsed !== undefined ? problemPath(id, parsed) : undefined;
}

// Where to sign in on the way to a problem, to come back to it after.
export function signInPath(path: string) {
  return `/?${new URLSearchParams({ next: path })}`;
}
