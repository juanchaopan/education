import { bookStatus, type Book } from '@education/problems/server';
import { problemAccess, type ProblemViewer } from './learning/domain/problem-access.js';
import { RequestError } from './shared/request-error.js';

// The book a problem version is filed in, as the problem list has it;
// undefined when the version is not on the list.
export type BookOf = (id: string, version: number) => Book | undefined;

const refused = {
  unassigned: '这本书还没有安排给你。',
  unavailable: '这本书暂时不可用。',
};

// Lets the viewer into a problem version filed in `book` and returns the
// book, or throws why not: 404 for a version not on the problem list, 403
// with the reason for a book the viewer may not open. The refusal names
// neither the book nor whom it is given to.
export function admit(viewer: ProblemViewer, book: Book | undefined): Book {
  const access = problemAccess(viewer, book && { id: book.id, status: bookStatus(book) });
  if (access === 'missing' || !book) throw new RequestError(404, '这道题或这个版本暂时不可用。');
  if (access === 'unassigned' || access === 'unavailable')
    throw new RequestError(403, refused[access], access);
  return book;
}
