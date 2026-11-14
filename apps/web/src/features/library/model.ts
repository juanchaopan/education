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

// Where the back button leads from a problem opened directly: a child's home
// for a child, the parent space for a parent, the home page for anyone else.
export function homeOf(viewer: Viewer) {
  return viewer.kind === 'parent' ? '/family' : '/';
}
