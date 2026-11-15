// The sign-in page's two tabs, each at its own address.
export type SignInTab = 'child' | 'parent';

// Where to sign in, and the page of this site to come back to after.
export function signInPath(tab: SignInTab, next?: string) {
  const path = `/login/${tab}`;
  return next ? `${path}?${new URLSearchParams({ next })}` : path;
}

const thisSite = 'https://this-site.invalid';

function onThisSite(path: string) {
  try {
    return new URL(path, thisSite);
  } catch {
    return undefined;
  }
}

// The page a sign-in comes back to: a path on this site, with its query and
// its "#" part, written as the browser reads it. Anything that could lead
// elsewhere is ignored: a whole address of another site or scheme, a path the
// browser would take for another host ("//", or a backslash, which it reads
// as a slash), the tabs and line breaks it silently drops, or no path at all.
export function returnPath(next: string | null | undefined) {
  if (!next?.startsWith('/') || next.startsWith('//')) return undefined;
  if (/[\\\p{Cc}]/u.test(next)) return undefined;
  const url = onThisSite(next);
  if (url?.origin !== thisSite) return undefined;
  return url.pathname + url.search + url.hash;
}
