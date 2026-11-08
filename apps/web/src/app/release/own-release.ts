import { releasePattern } from './release-pattern';

// The release this page was built as, from the meta tag a deployment's build
// writes into the HTML; undefined for a local build, which never updates.
export function ownRelease(page: Document = document) {
  const named = page.querySelector<HTMLMetaElement>('meta[name="education-release"]')?.content;
  return named && releasePattern.test(named) ? named : undefined;
}
