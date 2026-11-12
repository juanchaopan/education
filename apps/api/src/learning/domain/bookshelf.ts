import type { BookStatus } from '@education/contracts';

// A book as the shelves show it: its stable id, its name, grade and subject,
// its cover, its status and its problems at their latest version, in order.
export type ShelvedBook = Readonly<{
  id: string;
  name: string;
  grade: string;
  subject: string;
  cover: string | null;
  status: BookStatus;
  problems: readonly Readonly<{ id: string; version: number; title: string }>[];
}>;

// The order shelves list grades and subjects in.
export type ShelfOrder = Readonly<{ grades: readonly string[]; subjects: readonly string[] }>;

export type BookFilter = Readonly<{ grade?: string; subject?: string }>;

const names = new Intl.Collator('zh-CN', { numeric: true });

// The books in shelf order: by grade, then subject, in the catalogue's order,
// then by name.
export function arrange(books: readonly ShelvedBook[], order: ShelfOrder) {
  const place = (list: readonly string[], value: string) => list.indexOf(value);
  return books.toSorted(
    (a, b) =>
      place(order.grades, a.grade) - place(order.grades, b.grade) ||
      place(order.subjects, a.subject) - place(order.subjects, b.subject) ||
      names.compare(a.name, b.name) ||
      (a.id < b.id ? -1 : Number(a.id > b.id)),
  );
}

// A child's progress in a book: how many of its problems the child has done,
// of any version, out of how many it holds now; finished once all are done.
export function progress(book: ShelvedBook, done: ReadonlySet<string>) {
  const count = book.problems.filter(({ id }) => done.has(id)).length;
  const total = book.problems.length;
  return { done: count, total, finished: total > 0 && count === total };
}

// One page of a shelf: the books the filter matches, how many there are, the
// grades the shelf has books in and the subjects of the chosen grade (every
// subject when no grade is chosen), in the catalogue's order.
export function browse<Book extends ShelvedBook>(
  shelf: readonly Book[],
  order: ShelfOrder,
  filter: BookFilter,
  page: Readonly<{ offset: number; size: number }>,
) {
  const inGrade = shelf.filter(({ grade }) => !filter.grade || grade === filter.grade);
  const matching = inGrade.filter(({ subject }) => !filter.subject || subject === filter.subject);
  return {
    total: matching.length,
    grades: order.grades.filter((grade) => shelf.some((book) => book.grade === grade)),
    subjects: order.subjects.filter((subject) => inGrade.some((book) => book.subject === subject)),
    books: matching.slice(page.offset, page.offset + page.size),
    hasMore: page.offset + page.size < matching.length,
  };
}

// Whether a book can be newly given to a child: it is available and holds a
// published problem.
export const assignable = (book: ShelvedBook | undefined) =>
  !!book && book.status === 'available' && book.problems.length > 0;
