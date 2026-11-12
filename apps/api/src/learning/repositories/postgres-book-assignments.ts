import type pg from 'pg';

export type BookAssignmentRow = { childId: string; bookId: string; assignedAt: Date };

// Every book the children have been given, newest first.
export async function readBookAssignments(
  client: pg.PoolClient,
  childIds: readonly string[],
): Promise<BookAssignmentRow[]> {
  const { rows } = await client.query<BookAssignmentRow>(
    `SELECT child_id AS "childId",book_id AS "bookId",assigned_at AS "assignedAt"
     FROM book_assignments WHERE child_id=ANY($1::uuid[])
     ORDER BY assigned_at DESC,book_id`,
    [childIds],
  );
  return rows;
}

// The problems among `problemIds` each child has finished, alone or with
// help, at any version.
export async function readDoneProblems(
  client: pg.PoolClient,
  childIds: readonly string[],
  problemIds: readonly string[],
) {
  const { rows } = await client.query<{ childId: string; problemId: string }>(
    `SELECT DISTINCT child_id AS "childId",problem_id AS "problemId" FROM progress
     WHERE child_id=ANY($1::uuid[]) AND problem_id=ANY($2::text[])
       AND (independent>0 OR assisted>0)`,
    [childIds, problemIds],
  );
  const done = new Map<string, Set<string>>(childIds.map((id) => [id, new Set()]));
  for (const { childId, problemId } of rows) done.get(childId)?.add(problemId);
  return done as ReadonlyMap<string, ReadonlySet<string>>;
}

// Giving a book the child already has changes nothing, so it keeps the time
// it was first given.
export async function assignBook(client: pg.PoolClient, childId: string, bookId: string) {
  await client.query(
    `INSERT INTO book_assignments(child_id,book_id) VALUES($1,$2)
     ON CONFLICT (child_id,book_id) DO NOTHING`,
    [childId, bookId],
  );
}

export async function cancelBook(client: pg.PoolClient, childId: string, bookId: string) {
  await client.query('DELETE FROM book_assignments WHERE child_id=$1 AND book_id=$2', [
    childId,
    bookId,
  ]);
}
