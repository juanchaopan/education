import { defineConfig } from '@playwright/test';
import { apiServer, origin } from './e2e/api-server';
import { reviewBrowser } from './scripts/lesson-review-capture.mjs';

// The review recording of one lesson (`npm run lesson:review -- <lesson>`):
// desktop Chromium, whose screencast and media recorder the capture uses,
// against the built site served by the API on a port of its own. The server
// has no database; the walk answers for the child's session and the lesson's
// requests. The recordings go to review-recordings/, which no other test run
// empties; Playwright's own output, which it empties on each run, gets a
// folder inside it.
const port = 4195;

export default defineConfig({
  testDir: './review',
  outputDir: './review-recordings/.playwright',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    ...reviewBrowser,
    baseURL: origin(port),
    locale: 'zh-CN',
  },
  webServer: apiServer(port, false),
});
