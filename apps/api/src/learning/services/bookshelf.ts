import type pg from 'pg';
import {
  childBookPageSize,
  shelfPageSize,
  type ChildBookPage,
  type ChildBookQuery,
  type ChildShelfPage,
  type ChildShelfQuery,
  type FamilyShelfPage,
  type FamilyShelfQuery,
} from '@education/contracts';
import {
  assignable,
  browse,
  problemIds,
  progress,
  type ShelfOrder,
  type ShelvedBook,
} from '../domain/bookshelf.js';
import { childBookPage, isFresh } from '../domain/child-books.js';
import {
  assignBook,
  cancelBook,
  readBookAssignments,
  readDoneProblems,
  readStudyTimes,
} from '../repositories/postgres-book-assignments.js';
import { RequestError } from '../../shared/request-error.js';

type Credentials = { token?: string; csrf?: string };
// Work for a signed-in parent on the whole family, given its children's ids
// in the order the parent space lists them.
type FamilyTransaction = <T>(
  credentials: Credentials,
  work: (client: pg.PoolClient, childIds: readonly string[]) => Promise<T>,
) => Promise<T>;
// Work for a signed-in parent on one child of the family.
type ParentTransaction = <T>(
  credentials: Credentials,
  childId: string,
  work: (client: pg.PoolClient) => Promise<T>,
) => Promise<T>;
type ChildTransaction = <T>(
  credentials: Credentials,
  work: (client: pg.PoolClient, childId: string) => Promise<T>,
) => Promise<T>;

// The catalogue's books in shelf order and by id, and the order of grades
// and subjects.
export type Shelf = ShelfOrder &
  Readonly<{ books: readonly ShelvedBook[]; byId: ReadonlyMap<string, ShelvedBook> }>;

const page = (offset: string | undefined, size: number) => ({ offset: Number(offset ?? 0), size });

// A book as every shelf sends it: its problems counted, not listed.
const card = ({ problems, ...book }: ShelvedBook) => ({ ...book, problems: problems.length });

// Whom each book was given to, by book id.
async function holders(client: pg.PoolClient, childIds: readonly string[]) {
  const given = new Map<string, Set<string>>();
  for (const { bookId, childId } of await readBookAssignments(client, childIds))
    given.set(bookId, (given.get(bookId) ?? new Set()).add(childId));
  return given as ReadonlyMap<string, ReadonlySet<string>>;
}

// The books given to a child, newest first, with when each was given and
// first opened, and the problems of those books the child has done. A book
// the catalogue no longer lists is left out.
export async function readChildBooks(shelf: Shelf, client: pg.PoolClient, childId: string) {
  const books = (await readBookAssignments(client, [childId])).flatMap(
    ({ bookId, assignedAt, openedAt }) => {
      const book = shelf.byId.get(bookId);
      return book ? [{ book, assignedAt, openedAt }] : [];
    },
  );
  const done = await readDoneProblems(client, [childId], problemIds(books.map(({ book }) => book)));
  return { books, done: done(childId) };
}

// The library holds the books no child of the family has that can be given;
// the family shelf, every book some child has, with every child's progress.
async function familyShelf(
  shelf: Shelf,
  client: pg.PoolClient,
  childIds: readonly string[],
  query: FamilyShelfQuery,
): Promise<FamilyShelfPage> {
  const given = await holders(client, childIds);
  const books = shelf.books.filter((book) =>
    query.shelf === 'family' ? given.has(book.id) : assignable(book) && !given.has(book.id),
  );
  const found = browse(books, shelf, query, page(query.offset, shelfPageSize));
  const done = await readDoneProblems(client, childIds, problemIds(found.books));
  return {
    ...found,
    books: found.books.map((book) => ({
      ...card(book),
      children: childIds.map((childId) => ({
        childId,
        assigned: !!given.get(book.id)?.has(childId),
        done: progress(book, done(childId)).done,
      })),
    })),
  };
}

function onChildShelf(book: ShelvedBook, assigned: boolean, state: ChildShelfQuery['state']) {
  if (state === 'assigned') return assigned;
  if (state === 'unassigned') return !assigned && assignable(book);
  return assigned || assignable(book);
}

// A child's shelf holds the books that can be given and those the child
// already has, including ones no longer available.
async function childShelf(
  shelf: Shelf,
  client: pg.PoolClient,
  childId: string,
  query: ChildShelfQuery,
): Promise<ChildShelfPage> {
  const given = await holders(client, [childId]);
  const books = shelf.books.filter((book) => onChildShelf(book, given.has(book.id), query.state));
  const found = browse(books, shelf, query, page(query.offset, shelfPageSize));
  const done = (await readDoneProblems(client, [childId], problemIds(found.books)))(childId);
  return {
    ...found,
    books: found.books.map((book) => ({
      ...card(book),
      assigned: given.has(book.id),
      done: progress(book, done).done,
    })),
  };
}

// The latest of the times the child handed in an answer to one of the
// book's problems.
function lastStudied(book: ShelvedBook, studied: ReadonlyMap<string, Date>) {
  const times = book.problems.flatMap(({ id }) => studied.get(id) ?? []);
  return times.length ? new Date(Math.max(...times.map((time) => time.getTime()))) : null;
}

// The signed-in child's books in the home's order, with how many each filter
// holds, and one page of the chosen filter with every problem in each book.
async function childBooks(
  shelf: Shelf,
  client: pg.PoolClient,
  childId: string,
  query: ChildBookQuery,
): Promise<ChildBookPage> {
  const { books, done } = await readChildBooks(shelf, client, childId);
  const studied = await readStudyTimes(client, childId, problemIds(books.map(({ book }) => book)));
  const given = books.map(({ book, assignedAt, openedAt }) => {
    const { done: count, finished } = progress(book, done);
    return { book, assignedAt, openedAt, studiedAt: lastStudied(book, studied), finished, count };
  });
  const found = childBookPage(given, query.books, page(query.offset, childBookPageSize));
  return {
    ...found,
    books: found.books.map((entry) => ({
      ...card(entry.book),
      done: entry.count,
      assignedAt: entry.assignedAt.toISOString(),
      studiedAt: entry.studiedAt?.toISOString() ?? null,
      fresh: isFresh(entry),
      items: entry.book.problems.map((problem) => ({ ...problem, done: done.has(problem.id) })),
    })),
  };
}

export function createBookshelfService({
  family,
  parent,
  child,
  shelf,
}: {
  family: FamilyTransaction;
  parent: ParentTransaction;
  child: ChildTransaction;
  shelf: Shelf;
}) {
  return {
    familyShelf: (credentials: Credentials, query: FamilyShelfQuery) =>
      family(credentials, (client, childIds) => familyShelf(shelf, client, childIds, query)),
    childShelf: (credentials: Credentials, childId: string, query: ChildShelfQuery) =>
      parent(credentials, childId, (client) => childShelf(shelf, client, childId, query)),
    childBooks: (credentials: Credentials, query: ChildBookQuery) =>
      child(credentials, (client, childId) => childBooks(shelf, client, childId, query)),
    assign: (credentials: Credentials, childId: string, bookId: string) =>
      parent(credentials, childId, async (client) => {
        if (!assignable(shelf.byId.get(bookId)))
          throw new RequestError(409, '这本书暂时不能安排，请刷新书架。');
        await assignBook(client, childId, bookId);
      }),
    cancel: (credentials: Credentials, childId: string, bookId: string) =>
      parent(credentials, childId, (client) => cancelBook(client, childId, bookId)),
  };
}

export type BookshelfService = ReturnType<typeof createBookshelfService>;
