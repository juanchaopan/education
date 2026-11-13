import type { BookStatus, ProblemAccessReason, ProblemMode } from '@education/contracts';

// Who opens a problem: a signed-in child, with the ids of the books given to
// that child, or a parent whose email is verified.
export type ProblemViewer =
  Readonly<{ kind: 'child'; given: ReadonlySet<string> }> | Readonly<{ kind: 'parent' }>;

// The book a problem version is filed in; undefined when the version is not
// on the problem list.
export type FiledBook = Readonly<{ id: string; status: BookStatus }> | undefined;

// Whether a problem opens, and how: `practice` for a child, `preview` for a
// parent; otherwise why not.
export type ProblemAccess = 'missing' | ProblemAccessReason | ProblemMode;

// The first rule that holds decides. Only the child's own books count, so a
// sibling's or another family's book is unassigned, and a book never given is
// unassigned even while it is unavailable: the child never saw it.
export function problemAccess(viewer: ProblemViewer, book: FiledBook): ProblemAccess {
  if (!book) return 'missing';
  if (viewer.kind === 'child' && !viewer.given.has(book.id)) return 'unassigned';
  if (book.status !== 'available') return 'unavailable';
  return viewer.kind === 'child' ? 'practice' : 'preview';
}
