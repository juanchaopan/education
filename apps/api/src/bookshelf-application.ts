import type pg from 'pg';
import {
  bookStatus,
  grades,
  problemRegistry,
  subjects,
  type ProblemRegistry,
} from '@education/problems/server';
import { childSessionTransaction } from './child-session-transaction.js';
import { arrange } from './learning/domain/bookshelf.js';
import { createBookshelfService, type Shelf } from './learning/services/bookshelf.js';
import { parentFamilyTransactions } from './parent-child-transaction.js';

// The catalogue's books as the shelves show them, in shelf order.
export function shelfOf(registry: ProblemRegistry): Shelf {
  const order = { grades, subjects };
  const books = registry.books.map((book) => ({
    id: book.id,
    name: book.category,
    grade: book.grade,
    subject: book.subject,
    cover: book.cover ?? null,
    status: bookStatus(book),
    problems: registry
      .problemsOf(book.id)
      .map(({ id, version, title }) => ({ id, version, title })),
  }));
  return { ...order, books: arrange(books, order) };
}

export function createBookshelf(pool: pg.Pool, registry = problemRegistry) {
  const parent = parentFamilyTransactions(pool);
  return createBookshelfService({
    family: parent.family,
    parent: parent.child,
    child: childSessionTransaction(pool),
    shelf: shelfOf(registry),
  });
}
