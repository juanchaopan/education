import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const origin = (port: number) => `http://127.0.0.1:${port}`;
function server(port: number) {
  return {
    command: `HOST=127.0.0.1 PORT=${port} npm start -w @education/api`,
    url: `${origin(port)}/health/live`,
    reuseExistingServer: false,
    env: {
      APP_ORIGIN: origin(port),
      REGISTRATION_ENABLED: process.env.DATABASE_URL ? 'true' : 'false',
      // Independent suites do not consume each other's real authentication budgets.
      AUTH_RATE_LIMIT_KEY: randomBytes(32).toString('hex'),
    },
  };
}
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], baseURL: origin(4173) } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: origin(4174) },
    },
  ],
  webServer: [server(4173), server(4174)],
});
