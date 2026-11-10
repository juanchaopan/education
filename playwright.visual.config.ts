import { defineConfig, devices } from '@playwright/test';

// Visual baselines and accessibility checks. Screenshots depend on the
// browser build and the installed fonts, so the suite runs only inside the
// Playwright image named in scripts/visual.mjs and in the CI visual job: that
// image pins Chromium and the Chinese font (WenQuanYi Zen Hei). Baselines are
// never written by a normal run; they are generated on purpose with
// `npm run test:visual -- --update` and reviewed by a maintainer in the PR.
const pagesPort = 4190;
const storiesPort = 6190;
const origin = (port: number) => `http://127.0.0.1:${port}`;

// Every viewport renders at one device pixel, which keeps the baselines small;
// layout, wrapping and colour are what they guard.
const viewports = [
  { name: 'desktop', device: devices['Desktop Chrome'] },
  { name: 'tablet', device: devices['iPad (gen 7)'] },
  { name: 'phone', device: devices['iPhone 13'] },
];

const preview = (port: number, folder: string) => ({
  command: `npm exec -w @education/web -- vite preview --outDir ${folder} --host 127.0.0.1 --port ${port} --strictPort`,
  url: origin(port),
  reuseExistingServer: false,
});

export default defineConfig({
  testDir: './visual',
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The same code gives the same screenshots, so a test that passes only on
  // its retry fails the run in CI; the retry shows whether it failed once or
  // every time.
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    trace: 'retain-on-failure',
    // Text is smoothed in grey everywhere. Chromium otherwise smooths text in
    // colour (subpixel) only where it sits on an opaque layer, which depends
    // on how the page happens to be split into layers when it is painted.
    launchOptions: { args: ['--disable-lcd-text'] },
  },
  expect: {
    // How a screenshot comes to depend on the page alone: visual/render.ts.
    // A lesson scene paints a large picture with many shadowed props, which
    // the image's software renderer draws slowly; a screenshot may take a
    // few seconds, and a new baseline needs two identical ones in a row.
    toHaveScreenshot: { caret: 'hide', maxDiffPixels: 20, timeout: 20_000 },
  },
  projects: viewports.flatMap(({ name, device }) => {
    const use = { ...device, defaultBrowserType: 'chromium' as const, deviceScaleFactor: 1 };
    return [
      {
        name,
        testIgnore: /stories\.spec\.ts$/,
        use: { ...use, baseURL: origin(pagesPort) },
      },
      {
        name: `${name}-stories`,
        testMatch: /stories\.spec\.ts$/,
        use: { ...use, baseURL: origin(storiesPort) },
      },
    ];
  }),
  webServer: [preview(pagesPort, 'dist'), preview(storiesPort, 'storybook-static')],
});
