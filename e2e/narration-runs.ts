import { expect, type Page } from '@playwright/test';
import pg from 'pg';
import { removeFamilies } from './family-cleanup.js';
import { listenToNarration } from './narration-check.js';
import { giveBook, seedSignedInFamily } from './seeded-family.js';
import { signInWithToken } from './session-cookie.js';

// What a lesson's narration check shares, whichever lesson it plays: who can
// be signed in where, the check that no line failed, and a signed-in child
// of a family seeded for the test.

const database = process.env.DATABASE_URL;

// The test servers answer over http, and WebKit sends no Secure cookie there,
// so a child of the database can be signed in only in Chromium.
export const signsIn = (browserName: string) => !!database && browserName === 'chromium';

export const noLineFailed = (page: Page) =>
  expect(page.locator('[data-narration-failure]')).toHaveCount(0);

type Listener = Awaited<ReturnType<typeof listenToNarration>>;

// The lesson a narration check opens: its page, and the book that holds it,
// which the child is given.
type Lesson = Readonly<{ path: string; book: string }>;

// Signs in the only child of a family seeded in the isolated test database,
// given the lesson's book, listens to the narration from before the lesson
// loads, opens it and lets `hear` play it; the family is removed afterwards,
// whatever happens.
export async function asSignedInChild(
  page: Page,
  baseURL: string,
  { path, book }: Lesson,
  hear: (narration: Listener) => Promise<void>,
) {
  if (!database?.endsWith('/education_test')) throw new Error('Use isolated education_test');
  await expect
    .poll(async () => (await page.request.get('/health/ready')).status(), { timeout: 15_000 })
    .toBe(200);
  const pool = new pg.Pool({ connectionString: database });
  const { family, children } = await seedSignedInFamily(pool, ['小鹿']);
  try {
    await giveBook(pool, children[0]!.id, book);
    await signInWithToken(page, baseURL, children[0]!.token);
    const narration = await listenToNarration(page);
    await page.goto(path);
    await hear(narration);
  } finally {
    await removeFamilies(pool, [family]);
    await pool.end();
  }
}
