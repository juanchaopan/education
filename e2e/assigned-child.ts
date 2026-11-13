import type { ChildBook, ChildBookPage, ProblemSummary } from '@education/contracts';
import type { Page } from '@playwright/test';

// The child the test's server answers for: signed in, with the book that
// holds the garden lesson given to them. The test answers for the server, so
// no database is needed.
export const child = { role: 'child', nickname: '小鹿', csrfToken: 'a'.repeat(43) } as const;

export const garden: ProblemSummary = {
  id: 'garden-balance',
  version: 1,
  title: '一棵青菜有多重',
  grade: '一年级',
  subject: '数学',
  category: '学而思',
  sequence: 1,
};

// The book that holds the garden lesson, given to the child and not opened yet.
export const gardenBook: ChildBook = {
  id: 'g1-math-xueersi',
  name: '学而思',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 1,
  done: 0,
  assignedAt: '2026-11-12T08:00:00.000Z',
  studiedAt: null,
  fresh: true,
  items: [{ id: garden.id, version: garden.version, title: garden.title, done: false }],
};

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

// A signed-in child with the given books, who may open the garden lesson.
export async function signInAsAssignedChild(
  page: Page,
  books: readonly ChildBook[] = [gardenBook],
) {
  await page.route('**/api/v1/children/session', (route) => route.fulfill({ json: child }));
  await page.route('**/api/v1/children/assignments?*', (route) =>
    route.fulfill({ json: bookPage(books) }),
  );
  await page.route(`**/api/v1/problems/${garden.id}/${garden.version}`, (route) =>
    route.fulfill({ json: garden }),
  );
}
