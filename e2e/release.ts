import { expect, type Page } from '@playwright/test';

// Two releases of the site, named as a deployment's build names them.
export const releases = { older: 'a'.repeat(40), newer: 'b'.repeat(40) };

// What the deployment answers when a page checks its version file: a release,
// a failed request, or a reply that names no release.
type Served = string | 'fail' | 'unreadable';

// A path the site answers with its page: no file extension and not the API.
function pagePath(url: URL) {
  return !/\.\w+$/.test(url.pathname) && !url.pathname.startsWith('/api/');
}

// Plays a deployment that moves between releases under an open page. Every
// page load gets the page of release `page`, named in its meta tag as a
// deployment's build names it, and the version file names release `served`.
// The two differ when a cache still holds an older page. Loads are counted,
// so a test can tell a reload from none, and every answer to a check is kept.
export async function serveReleases(page: Page, start: string) {
  const site = {
    page: start,
    served: start as Served,
    loads: 0,
    answered: [] as Served[],
    // A deployment that serves this release, its page and its version file.
    deploy(release: string) {
      site.page = release;
      site.served = release;
    },
  };
  await page.route(pagePath, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    site.loads++;
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        '</head>',
        `<meta name="education-release" content="${site.page}"></head>`,
      ),
    });
  });
  await page.route('**/version.json', async (route) => {
    const served = site.served;
    if (served === 'fail') await route.abort('internetdisconnected');
    else if (served === 'unreadable') await route.fulfill({ body: '<!doctype html>' });
    else await route.fulfill({ json: { revision: served } });
    site.answered.push(served);
  });
  return site;
}

type Site = Awaited<ReturnType<typeof serveReleases>>;

// Checks the deployment at once, as the page does when it gets focus, until
// the page has seen what the deployment serves now. A check already on its
// way may have been answered before the deployment moved, and the page joins
// it instead of asking again, so the page is asked once more after it.
export async function checkNow(page: Page, site: Site) {
  await expect
    .poll(async () => {
      const before = site.answered.length;
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect.poll(() => site.answered.length).toBeGreaterThan(before);
      return site.answered.at(-1) === site.served;
    })
    .toBe(true);
}

// The meta tag that names the release of the page on screen.
export function releaseName(page: Page) {
  return page.locator('meta[name="education-release"]');
}
