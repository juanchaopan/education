import { randomBytes } from 'node:crypto';

// The address of a test API server on a port of this machine.
export const origin = (port: number) => `http://127.0.0.1:${port}`;

// A Playwright web server running the built API, which also serves the built
// site, on its own port. Its settings are passed as its environment rather
// than written into the command, so the command runs the same on every
// system. Registration needs a database, so it is on only where one is given.
export function apiServer(port: number, registration = !!process.env.DATABASE_URL) {
  return {
    command: 'npm start -w @education/api',
    url: `${origin(port)}/health/live`,
    reuseExistingServer: false,
    env: {
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_ORIGIN: origin(port),
      PIN_PEPPER: 'ab'.repeat(32),
      REGISTRATION_ENABLED: registration ? 'true' : 'false',
      // Each server keys its authentication budgets with its own secret, so the
      // budgets of tests on different servers never add up.
      AUTH_RATE_LIMIT_KEY: randomBytes(32).toString('hex'),
    },
  };
}
