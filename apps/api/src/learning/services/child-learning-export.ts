import type pg from 'pg';
import type { ChildExport } from '@education/contracts';
import { progress } from '../domain/bookshelf.js';
import { problemVariations } from '../domain/variation.js';
import { readLiveDrafts } from '../repositories/postgres-draft.js';
import { readLearningEvidence } from '../repositories/postgres-learning-summary.js';
import { readVariationRounds } from '../repositories/postgres-variation-rounds.js';
import { readStudyDays } from '../repositories/postgres-study-time.js';
import { readChildBooks, type Shelf } from './bookshelf.js';
import { summarizeProblem, withTitle, type Title } from './learning-summary.js';

// Everything a family export holds about one child's learning, read in the
// caller's transaction so it matches the family it was authorized for. Each
// book given to the child comes with the child's progress in it now, each
// problem with variations comes with what they show and every round of them,
// and every day the child studied comes with its study time.
export function createChildLearningExport(title: Title, shelf: Shelf) {
  return async (client: pg.PoolClient, childId: string): Promise<Omit<ChildExport, 'nickname'>> => {
    const evidence = await readLearningEvidence(client, childId);
    const rounds = await readVariationRounds(client, childId);
    const studyTime = await readStudyDays(client, childId);
    const given = await readChildBooks(shelf, client, childId);
    const drafts = await readLiveDrafts(client, childId);
    return {
      learning: evidence.map((row) => summarizeProblem(row, title)),
      variations: problemVariations(rounds).map((problem) => withTitle(problem, title)),
      studyTime,
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
