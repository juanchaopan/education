// The sign-in page's two tabs, each at its own address.
export type SignInTab = 'child' | 'parent';

// Where to sign in, and the page of this site to come back to after.
export function signInPath(tab: SignInTab, next?: string) {
  const path = `/login/${tab}`;
  return next ? `${path}?${new URLSearchParams({ next })}` : path;
}

const thisSite = 'https://this-site.invalid';

// A path that leads off this site: one that starts with two slashes, which a
// link takes for another host, or holds a backslash, which a browser reads
// as a slash, or holds the tabs and line breaks a browser silently drops.
const leadsAway = (path: string) => path.startsWith('//') || /[\\\p{Cc}]/u.test(path);

function onThisSite(path: string) {
  try {
    return new URL(path, thisSite);
  } catch {
    return undefined;
  }
}

// The page a sign-in comes back to: a path on this site, with its query and
// its "#" part, written as the browser reads it. Anything that could lead
// elsewhere is ignored: a whole address of another site or scheme, no path
// at all, or a path that leads away either as written or once the browser
// has resolved its dot segments ("/.//host" reads as "//host").
export function returnPath(next: string | null | undefined) {
  if (!next?.startsWith('/') || leadsAway(next)) return undefined;
  const url = onThisSite(next);
  if (url?.origin !== thisSite) return undefined;
  const path = url.pathname + url.search + url.hash;
  return leadsAway(path) ? undefined : path;
}
