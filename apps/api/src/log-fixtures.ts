import { buildApp } from './app.js';

type App = ReturnType<typeof buildApp>;
export type LogLine = Record<string, unknown> & { msg: string; level: number };

// An application whose structured log lines are kept for a test to read. It is
// added to `apps`, which the test closes afterwards.
export function loggedApp(apps: App[], options: Parameters<typeof buildApp>[0] = {}) {
  const lines: string[] = [];
  const app = buildApp({ ...options, logStream: { write: (line) => lines.push(line) } });
  apps.push(app);
  const completed = () =>
    lines
      .map((line) => JSON.parse(line) as LogLine)
      .filter(({ msg }) => msg === 'Request completed');
  return { app, text: () => lines.join(''), completed };
}
