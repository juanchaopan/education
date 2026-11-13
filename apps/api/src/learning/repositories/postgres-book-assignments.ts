import type pg from 'pg';

type BookAssignmentRow = {
  childId: string;
  bookId: string;
  assignedAt: Date;
  openedAt: Date | null;
};

// Every book the children have been given, newest first, with when each
// child first opened one of its problems.
export async function readBookAssignments(
  client: pg.PoolClient,
  childIds: readonly string[],
): Promise<BookAssignmentRow[]> {
  const { rows } = await client.query<BookAssignmentRow>(
    `SELECT child_id AS "childId",book_id AS "bookId",assigned_at AS "assignedAt",
       opened_at AS "openedAt"
     FROM book_assignments WHERE child_id=ANY($1::uuid[])
     ORDER BY assigned_at DESC,book_id`,
    [childIds],
  );
  return rows;
}

const nothingDone: ReadonlySet<string> = new Set();

// The problems among `problemIds` each child has finished, alone or with
// help, at any version, as a lookup by child; a child who has done none of
// them gets the empty set.
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
  const done = new Map<string, Set<string>>();
  for (const { childId, problemId } of rows) {
    const problems = done.get(childId) ?? new Set<string>();
    done.set(childId, problems.add(problemId));
  }
  return (childId: string): ReadonlySet<string> => done.get(childId) ?? nothingDone;
}

// When the child last handed in an answer to each of `problemIds`, at any
// version; a problem never answered is left out.
export async function readStudyTimes(
  client: pg.PoolClient,
  childId: string,
  problemIds: readonly string[],
): Promise<ReadonlyMap<string, Date>> {
  const { rows } = await client.query<{ problemId: string; studiedAt: Date }>(
    `SELECT problem_id AS "problemId",max(updated_at) AS "studiedAt" FROM progress
     WHERE child_id=$1 AND problem_id=ANY($2::text[]) GROUP BY problem_id`,
    [childId, problemIds],
  );
  return new Map(rows.map(({ problemId, studiedAt }) => [problemId, studiedAt]));
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

// The first time the child opens a problem of a book given to them, the book
// stops being new; later openings, and books not given, change nothing.
export async function markBookOpened(client: pg.PoolClient, childId: string, bookId: string) {
  await client.query(
    `UPDATE book_assignments SET opened_at=now()
     WHERE child_id=$1 AND book_id=$2 AND opened_at IS NULL`,
    [childId, bookId],
  );
}
