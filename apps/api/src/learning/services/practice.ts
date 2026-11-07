import type pg from 'pg';
import { practicePageSize, type AssignPractice, type PracticePage } from '@education/contracts';
import { insertAssignment, readAssignments } from '../repositories/postgres-practice.js';
import { withTitle, type Title } from './learning-summary.js';
import { RequestError } from '../../shared/request-error.js';

type Credentials = { token?: string; csrf?: string };
type ChildTransaction = <T>(
  credentials: Credentials,
  work: (client: pg.PoolClient, childId: string) => Promise<T>,
) => Promise<T>;
type ParentTransaction = <T>(
  credentials: Credentials,
  childId: string,
  work: (client: pg.PoolClient) => Promise<T>,
) => Promise<T>;

export function createPracticeService(
  parent: ParentTransaction,
  child: ChildTransaction,
  title: Title,
) {
  async function page(
    client: pg.PoolClient,
    childId: string,
    offset: number,
  ): Promise<PracticePage> {
    const rows = await readAssignments(client, childId, { limit: practicePageSize + 1, offset });
    return {
      hasMore: rows.length > practicePageSize,
      problems: rows.slice(0, practicePageSize).map((row) => withTitle(row, title)),
    };
  }
  return {
    forParent: (credentials: Credentials, childId: string, offset: number) =>
      parent(credentials, childId, (client) => page(client, childId, offset)),
    forChild: (credentials: Credentials, offset: number) =>
      child(credentials, (client, childId) => page(client, childId, offset)),
    assign: (credentials: Credentials, childId: string, problem: AssignPractice) =>
      parent(credentials, childId, async (client) => {
        if (!title(problem.id, problem.version))
          throw new RequestError(409, '这道题的这个版本暂时不可安排，请刷新题目列表。');
        await insertAssignment(client, childId, problem);
      }),
  };
}

export type PracticeService = ReturnType<typeof createPracticeService>;
