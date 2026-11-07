import type pg from 'pg';
import type { ChildExport } from '@education/contracts';
import { readLiveDrafts } from '../repositories/postgres-draft.js';
import { readLearningEvidence } from '../repositories/postgres-learning-summary.js';
import { readAssignments } from '../repositories/postgres-practice.js';
import { summarizeProblem, withTitle, type Title } from './learning-summary.js';

// Everything a family export holds about one child's learning, read in the
// caller's transaction so it matches the family it was authorized for.
export function createChildLearningExport(title: Title) {
  return async (client: pg.PoolClient, childId: string): Promise<Omit<ChildExport, 'nickname'>> => {
    const evidence = await readLearningEvidence(client, childId);
    const practice = await readAssignments(client, childId);
    const drafts = await readLiveDrafts(client, childId);
    return {
      learning: evidence.map((row) => summarizeProblem(row, title)),
      practice: practice.map((row) => withTitle(row, title)),
      drafts: drafts.map((row) => withTitle(row, title)),
    };
  };
}
