import type { ChildBook, ChildBookPage, ProblemSummary } from '@education/contracts';
import type { Page } from '@playwright/test';

// The child the test's server answers for: signed in, with books given to
// them. The test answers for the server, so no database is needed.
export const child = { role: 'child', nickname: '小鹿', csrfToken: 'a'.repeat(43) } as const;

// What a test names of a book; the rest of it is as a parent has just given it.
type BookName = Pick<ChildBook, 'id' | 'name' | 'grade' | 'subject'>;

// A book given to the child and not opened yet, holding `problems`.
export function givenBook(book: BookName, problems: readonly ProblemSummary[]): ChildBook {
  return {
    ...book,
    cover: null,
    status: 'available',
    problems: problems.length,
    done: 0,
    assignedAt: '2026-11-12T08:00:00.000Z',
    studiedAt: null,
    fresh: true,
    items: problems.map(({ id, version, title }) => ({ id, version, title, done: false })),
  };
}

export const garden: ProblemSummary = {
  id: 'garden-balance',
  version: 1,
  title: '一棵青菜有多重',
  grade: '一年级',
  subject: '数学',
  category: '学而思',
  sequence: 1,
};

// The book that holds the garden lesson.
export const gardenBook = givenBook(
  { id: 'g1-math-xueersi', name: '学而思', grade: '一年级', subject: '数学' },
  [garden],
);

// The child's books as the server lists them, all on one page.
export function bookPage(books: readonly ChildBook[]): ChildBookPage {
  const unavailable = books.filter(({ status }) => status === 'unavailable').length;
  const finished = books.filter(
    (book) => book.status === 'available' && !book.fresh && book.done === book.problems,
  ).length;
  return {
    counts: {
      all: books.length,
      learning: books.length - unavailable - finished,
      finished,
      unavailable,
      fresh: books.filter(({ fresh }) => fresh).length,
    },
    books: [...books],
    hasMore: false,
  };
}

// The child's books and the problems the child opens from them. A lesson's
// test or review recording passes its own problem and the book it is in.
type Given = Readonly<{ books?: readonly ChildBook[]; opens?: readonly ProblemSummary[] }>;

// A signed-in child with `books`, who may open each problem of `opens`; the
// garden lesson and its book unless others are named.
export async function signInAsAssignedChild(
  page: Page,
  { books = [gardenBook], opens = [garden] }: Given = {},
) {
  await page.route('**/api/v1/children/session', (route) => route.fulfill({ json: child }));
  await page.route('**/api/v1/children/assignments?*', (route) =>
    route.fulfill({ json: bookPage(books) }),
  );
  for (const problem of opens)
    await page.route(`**/api/v1/problems/${problem.id}/${problem.version}`, (route) =>
      route.fulfill({ json: problem }),
    );
}
