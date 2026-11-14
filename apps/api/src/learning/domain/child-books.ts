import type { ChildBookCounts, ChildBookFilter } from '@education/contracts';
import type { ShelvedBook } from './bookshelf.js';

// A book given to a child, as the child's home lists it: when it was given,
// when the child first opened one of its problems (null before that), when
// the child last handed in an answer in it (null before the first), and
// whether the child has finished it.
export type GivenBook = Readonly<{
  book: ShelvedBook;
  assignedAt: Date;
  openedAt: Date | null;
  studiedAt: Date | null;
  finished: boolean;
}>;

// A book is new to the child until the child opens one of its problems. A
// book the child cannot open is never new.
export const isFresh = ({ book, openedAt }: GivenBook) =>
  book.status === 'available' && openedAt === null;

// Which filter a book falls under. A new book is one the child is still on,
// even when an earlier assignment of it was finished.
export function filterOf(given: GivenBook): ChildBookFilter {
  if (given.book.status !== 'available') return 'unavailable';
  return isFresh(given) || !given.finished ? 'learning' : 'finished';
}

// New books first, then the books the child is still on, then finished
// books, then the ones that cannot be opened now.
function group(given: GivenBook) {
  if (isFresh(given)) return 0;
  return { learning: 1, finished: 2, unavailable: 3 }[filterOf(given)];
}

const newestFirst = (a: Date | null, b: Date | null) => {
  if (a === null || b === null) return Number(a === null) - Number(b === null);
  return b.getTime() - a.getTime();
};

// Within a group, new books by when they were given, newest first; the
// others by when the child last studied them, most recent first, those never
// studied last and newest given first among them. Ties go by book id.
function compare(a: GivenBook, b: GivenBook) {
  const byGroup = group(a) - group(b);
  if (byGroup) return byGroup;
  const byStudy = group(a) === 0 ? 0 : newestFirst(a.studiedAt, b.studiedAt);
  return (
    byStudy ||
    newestFirst(a.assignedAt, b.assignedAt) ||
    (a.book.id < b.book.id ? -1 : Number(a.book.id > b.book.id))
  );
}

// The child's books in the home's order, how many each filter holds, and
// one page of the chosen filter, or of all of them without one.
export function childBookPage<Entry extends GivenBook>(
  given: readonly Entry[],
  filter: ChildBookFilter | undefined,
  page: Readonly<{ offset: number; size: number }>,
) {
  const ordered = given.toSorted(compare);
  const counts: ChildBookCounts = {
    all: ordered.length,
    learning: 0,
    finished: 0,
    unavailable: 0,
    fresh: 0,
  };
  for (const book of ordered) {
    counts[filterOf(book)] += 1;
    if (isFresh(book)) counts.fresh += 1;
  }
  const chosen = filter ? ordered.filter((book) => filterOf(book) === filter) : ordered;
  return {
    counts,
    books: chosen.slice(page.offset, page.offset + page.size),
    hasMore: page.offset + page.size < chosen.length,
  };
}
