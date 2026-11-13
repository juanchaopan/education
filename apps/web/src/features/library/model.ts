// Who opens a problem, as far as the page knows: still being found out,
// nobody signed in, a signed-in child with the session's token, or a parent
// with a verified email and the session's token.
export type Viewer =
  | Readonly<{ kind: 'checking' }>
  | Readonly<{ kind: 'guest' }>
  | Readonly<{ kind: 'child'; csrf: string }>
  | Readonly<{ kind: 'parent'; csrf: string }>;

// The picture a problem's note is drawn on: a backdrop, softly blurred, and
// the teaching character beside the note.
export type NoteArt = Readonly<{ backdrop: string; teacher: string }>;

// Where the back button leads from a problem opened directly: the parent
// space for a parent; for a child, the home page with the problem's book
// opened, once the book is known; the home page for anyone else.
export function homeOf(viewer: Viewer, book?: string) {
  if (viewer.kind === 'parent') return '/family';
  if (viewer.kind === 'child' && book) return `/?open=${encodeURIComponent(book)}`;
  return '/';
}
