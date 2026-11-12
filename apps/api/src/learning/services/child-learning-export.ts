import type pg from 'pg';
import type { ChildExport } from '@education/contracts';
import { progress } from '../domain/bookshelf.js';
import { readLiveDrafts } from '../repositories/postgres-draft.js';
import { readLearningEvidence } from '../repositories/postgres-learning-summary.js';
import { readChildBooks, type Shelf } from './bookshelf.js';
import { summarizeProblem, withTitle, type Title } from './learning-summary.js';

// Everything a family export holds about one child's learning, read in the
// caller's transaction so it matches the family it was authorized for. Each
// book given to the child comes with the child's progress in it now.
export function createChildLearningExport(title: Title, shelf: Shelf) {
  return async (client: pg.PoolClient, childId: string): Promise<Omit<ChildExport, 'nickname'>> => {
    const evidence = await readLearningEvidence(client, childId);
    const given = await readChildBooks(shelf, client, childId);
    const drafts = await readLiveDrafts(client, childId);
    return {
      learning: evidence.map((row) => summarizeProblem(row, title)),
      books: given.books.map(({ book, assignedAt }) => ({
        id: book.id,
        grade: book.grade,
        subject: book.subject,
        name: book.name,
        status: book.status,
        assignedAt: assignedAt.toISOString(),
        ...progress(book, given.done),
      })),
      drafts: drafts.map((row) => withTitle(row, title)),
    };
  };
}
