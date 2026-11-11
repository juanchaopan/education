import { defineConfig, devices } from '@playwright/test';
import { apiServer, origin } from './e2e/api-server';

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

// Lesson narration also plays in WebKit, the engine of Safari on iPads and
// iPhones; the sound checks run there on the desktop server.
const webkit = {
  name: 'webkit',
  testMatch: /(^|[\\/])[\w-]+-narration\.spec\.ts$/,
  use: { ...devices['Desktop Safari'], launchOptions: {}, baseURL: origin(shared.desktop) },
};

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
    ...Object.entries(browsers).flatMap(([name, device]) => {
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
    webkit,
  ],
  webServer: [shared, ...ownServers.map(({ ports }) => ports)]
    .flatMap((ports) => Object.values(ports))
    .map((port) => apiServer(port)),
});
