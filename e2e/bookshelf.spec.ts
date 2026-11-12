import { expect, test, type Page } from '@playwright/test';
import { shelfPageSize, type FamilyShelfBook, type FamilyShelfPage } from '@education/contracts';

// A shelf of hundreds of books, read 24 at a time, as the parent scrolls it.
// The books come from a generated list answered in the browser, so the test
// needs no database and the list never enters the problem catalogue.

const shelfSize = 400;
const child = '11111111-1111-4111-8111-111111111111';
const subjects = ['数学', '语文', '英语'];
const books: FamilyShelfBook[] = Array.from({ length: shelfSize }, (_, place) => ({
  id: `e2e-book-${place}`,
  name: `测试书 ${String(place + 1).padStart(3, '0')}`,
  grade: '一年级',
  subject: subjects[place % subjects.length]!,
  cover: null,
  status: 'available',
  problems: 10,
  children: [{ childId: child, assigned: false, done: 0 }],
}));

const session = {
  role: 'parent',
  email: 'e2e-parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'a'.repeat(43),
};

// Answers the parent's session, family and library from the generated list,
// failing the batches named in `failing` once each.
async function serveShelf(page: Page, failing = new Set<number>()) {
  await page.route('**/api/v1/session', (route) => route.fulfill({ json: session }));
  await page.route('**/api/v1/parents/children', (route) =>
    route.fulfill({
      json: {
        reauthenticationRequired: false,
        children: [{ id: child, nickname: '小米', credentialVersion: 1 }],
      },
    }),
  );
  await page.route('**/api/v1/parents/books?**', (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset'));
    if (failing.delete(offset)) return route.fulfill({ status: 503, json: {} });
    const shelf: FamilyShelfPage = {
      total: shelfSize,
      grades: ['一年级'],
      subjects,
      books: books.slice(offset, offset + shelfPageSize),
      hasMore: offset + shelfPageSize < shelfSize,
    };
    return route.fulfill({ json: shelf });
  });
}

test('scrolling down reads the whole library, batch by batch, and counts it', async ({ page }) => {
  test.setTimeout(120_000);
  await serveShelf(page);
  await page.goto('/family/practice');
  await expect(page.getByRole('heading', { name: '测试书 001' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(shelfPageSize);
  const done = page.getByText(`一共 ${shelfSize} 本，都在这里了`);
  while (!(await done.isVisible())) await page.mouse.wheel(0, 4000);
  await expect(page.getByRole('article')).toHaveCount(shelfSize);
  await expect(page.getByRole('heading', { name: '测试书 400' })).toBeVisible();
});

test('the button reads the next batch again after one did not load', async ({ page }) => {
  await serveShelf(page, new Set([shelfPageSize]));
  await page.goto('/family/practice');
  await expect(page.getByRole('article')).toHaveCount(shelfPageSize);
  await page.getByRole('button', { name: '加载更多' }).scrollIntoViewIfNeeded();
  await expect(page.getByText('这一批没加载出来')).toBeVisible();
  await page.getByRole('button', { name: '加载更多' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '测试书 025' })).toBeVisible();
});
