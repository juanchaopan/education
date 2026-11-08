import type { Page, Request } from '@playwright/test';

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
// so a test can tell a reload from none.
export async function serveReleases(page: Page, start: string) {
  const site = {
    page: start,
    served: start as Served,
    loads: 0,
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
  await page.route('**/version.json', (route) => {
    if (site.served === 'fail') return route.abort('internetdisconnected');
    if (site.served === 'unreadable') return route.fulfill({ body: '<!doctype html>' });
    return route.fulfill({ json: { revision: site.served } });
  });
  return site;
}

// Checks the deployment at once, as the page does when it gets focus, and
// waits until the version file has answered or failed.
export async function checkNow(page: Page) {
  const settled = new Promise<void>((resolve) => {
    const done = (request: Request) => {
      if (!request.url().endsWith('/version.json')) return;
      page.off('requestfinished', done);
      page.off('requestfailed', done);
      resolve();
    };
    page.on('requestfinished', done);
    page.on('requestfailed', done);
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await settled;
}

// The meta tag that names the release of the page on screen.
export function releaseName(page: Page) {
  return page.locator('meta[name="education-release"]');
}
