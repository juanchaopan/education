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
      PIN_PEPPER: 'ab'.repeat(32),
      REGISTRATION_ENABLED: process.env.DATABASE_URL ? 'true' : 'false',
      // Each server keys its authentication budgets with its own secret, so the
      // budgets of tests on different servers never add up.
      AUTH_RATE_LIMIT_KEY: randomBytes(32).toString('hex'),
    },
  };
}

// Every request comes from 127.0.0.1, so all tests on one server share that
// address's sign-in budget, and a sign-in attempt includes any request without
// a valid session. The parent account specs sign in and out the most, so they
// get servers of their own.
const accountSpecs =
  /(^|[\\/])(registration|session|recovery|verification|registration-key)\.spec\.ts$/;
const browsers = [
  { name: 'desktop', device: devices['Desktop Chrome'], ports: [4173, 4175] },
  {
    name: 'mobile',
    device: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' as const },
    ports: [4174, 4176],
  },
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    trace: 'retain-on-failure',
  },
  projects: browsers.flatMap(({ name, device, ports: [general, accounts] }) => [
    { name, testIgnore: accountSpecs, use: { ...device, baseURL: origin(general!) } },
    {
      name: `${name}-accounts`,
      testMatch: accountSpecs,
      use: { ...device, baseURL: origin(accounts!) },
    },
  ]),
  webServer: browsers.flatMap(({ ports }) => ports.map(server)),
});
