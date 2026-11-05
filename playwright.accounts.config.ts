import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './infra/tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 180_000,
  outputDir: 'test-results/accounts',
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    baseURL: `https://localhost:${process.env.ACCOUNTS_PORT_A ?? '8443'}`,
    // Only the generated one-day localhost certificate is self-signed.
    ignoreHTTPSErrors: true,
    trace: 'off',
  },
});
