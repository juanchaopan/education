import { isProblemId } from '@education/contracts';

// The school years and subjects books are filed under, in the order shelves
// list them. Chinese collation cannot order 一、二、三、六年级, so the order is
// written here; a new subject is added to its list.
export const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] as const;
export const subjects = ['数学', '语文', '英语'] as const;

// A book is one grade, subject and category, holding every problem filed
// under it, and is shown by its category's name. Its id is chosen when the
// book is added and never changes, whatever the book is later called, so
// what refers to a book keeps referring to it.
export type Book = Readonly<{
  id: string;
  grade: string;
  subject: string;
  category: string;
}>;

// The maintained books. A problem names its book; see ProblemPlugin.
export const books: readonly Book[] = [
  { id: 'g1-math-xueersi', grade: '一年级', subject: '数学', category: '学而思' },
];

// The books by id, after checking that every id is well formed and used once,
// that every book's grade and subject are on their lists, and that no two
// books file the same grade, subject and category.
export function indexBooks(list: readonly Book[]) {
  const byId = new Map<string, Book>();
  const places = new Set<string>();
  for (const book of list) {
    if (!isProblemId(book.id)) throw new Error(`Invalid book id: ${book.id}`);
    if (byId.has(book.id)) throw new Error(`Duplicate book: ${book.id}`);
    if (!(grades as readonly string[]).includes(book.grade))
      throw new Error(`Unknown grade of book ${book.id}: ${book.grade}`);
    if (!(subjects as readonly string[]).includes(book.subject))
      throw new Error(`Unknown subject of book ${book.id}: ${book.subject}`);
    const place = JSON.stringify([book.grade, book.subject, book.category]);
    if (places.has(place)) throw new Error(`Two books file ${place}`);
    places.add(place);
    byId.set(book.id, book);
  }
  return byId as ReadonlyMap<string, Book>;
}
