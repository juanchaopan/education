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

const browsers = {
  desktop: devices['Desktop Chrome'],
  mobile: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' as const },
};
type Ports = Record<keyof typeof browsers, number>;

// Every request comes from 127.0.0.1, so all tests on one server share that
// address's sign-in budget, and a sign-in attempt includes any request without
// a valid session. The parent account specs and the family acceptance, which
// sign in and out the most, get servers of their own; the rest share one.
const ownServers: { suffix: string; specs: RegExp; ports: Ports }[] = [
  {
    suffix: 'accounts',
    specs: /(^|[\\/])(registration|session|recovery|verification|registration-key)\.spec\.ts$/,
    ports: { desktop: 4175, mobile: 4176 },
  },
  {
    suffix: 'acceptance',
    specs: /(^|[\\/])empty-framework\.spec\.ts$/,
    ports: { desktop: 4177, mobile: 4178 },
  },
];
const shared: Ports = { desktop: 4173, mobile: 4174 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    trace: 'retain-on-failure',
  },
  projects: Object.entries(browsers).flatMap(([name, device]) => {
    const browser = name as keyof typeof browsers;
    return [
      {
        name,
        testIgnore: ownServers.map(({ specs }) => specs),
        use: { ...device, baseURL: origin(shared[browser]) },
      },
      ...ownServers.map(({ suffix, specs, ports }) => ({
        name: `${name}-${suffix}`,
        testMatch: specs,
        use: { ...device, baseURL: origin(ports[browser]) },
      })),
    ];
  }),
  webServer: [shared, ...ownServers.map(({ ports }) => ports)]
    .flatMap((ports) => Object.values(ports))
    .map(server),
});
