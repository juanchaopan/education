// Runs the checks that need PostgreSQL against a throwaway container set up
// like the database service of CI's app job: the same image, user and
// databases, with a random password, published on 127.0.0.1 at a free port
// this script picks. The migrations run first. The container is removed when
// the run ends, whether it passed, failed or was interrupted.
//   node scripts/with-database.mjs db [args]    the database tests, as CI runs them
//   node scripts/with-database.mjs e2e [args]   every browser test, the database ones included
// The arguments after the check go to its test command: Vitest for db,
// Playwright for e2e. Run it through npm (npm run test:db:local or
// test:e2e:local), which tells it where npm is.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { end, onInterrupt, run, start } from './processes.mjs';

export const image = 'postgres:17-alpine';
export const user = 'education';
export const databases = { app: 'education_test', ledger: 'education_ledger_test' };

// The npm commands of each check, in the order CI's app job runs them.
export function steps(check, extra) {
  const migrate = ['run', 'db:migrate'];
  if (check === 'db')
    return [
      migrate,
      ['run', 'test:db', '-w', '@education/api', '--', ...extra],
      ['run', 'db:complete-deletions', '-w', '@education/api'],
    ];
  if (check === 'e2e') return [migrate, ['run', 'test:e2e', '--', ...extra]];
  throw new Error('Name the check, db or e2e: node scripts/with-database.mjs <db|e2e> [args]');
}

// The password reaches the container from the environment of `docker run`,
// so it is never part of a command line.
export function containerArgs(name, port) {
  return [
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--env',
    `POSTGRES_USER=${user}`,
    '--env',
    'POSTGRES_PASSWORD',
    '--env',
    `POSTGRES_DB=${databases.app}`,
    '--publish',
    `127.0.0.1:${port}:5432`,
    image,
  ];
}

export function databaseUrls(port, password) {
  const url = (database) => `postgres://${user}:${password}@127.0.0.1:${port}/${database}`;
  return { DATABASE_URL: url(databases.app), DELETION_LEDGER_URL: url(databases.ledger) };
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const quiet = { stdio: ['ignore', 'ignore', 'inherit'] };
let interrupted = 0;
let current;

async function waitUntilReady(name) {
  // The image first runs a setup server reachable only through its socket,
  // so a ready answer over TCP comes from the server the tests will use.
  const ready = ['exec', name, 'pg_isready', '-q', '-h', '127.0.0.1', '-U', user];
  for (let attempt = 0; (await run('docker', ready, quiet)) !== 0; attempt += 1) {
    if (interrupted) throw new Error('Interrupted while PostgreSQL was starting');
    if (attempt === 60) throw new Error('PostgreSQL did not become ready within a minute');
    await delay(1000);
  }
}

async function startDatabase(name, port, password) {
  const env = { ...process.env, POSTGRES_PASSWORD: password };
  if ((await run('docker', containerArgs(name, port), { ...quiet, env })) !== 0)
    throw new Error(`Could not start ${image}; is Docker running?`);
  await waitUntilReady(name);
  const psql = ['exec', name, 'psql', '-q', '-v', 'ON_ERROR_STOP=1', '-U', user];
  const ledger = [...psql, '-d', databases.app, '-c', `CREATE DATABASE ${databases.ledger}`];
  if ((await run('docker', ledger, quiet)) !== 0)
    throw new Error('Could not create the deletion ledger database');
}

async function runSteps(plan, env) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run it through npm: npm run test:db:local or npm run test:e2e:local');
  for (const args of plan) {
    current = start(process.execPath, [cli, ...args], { env: { ...process.env, ...env } });
    const code = await current.exit;
    if (interrupted) return interrupted;
    if (code !== 0) return code;
  }
  return 0;
}

export async function withDatabase(name, plan) {
  const port = await freePort();
  const password = randomBytes(24).toString('hex');
  try {
    await startDatabase(name, port, password);
    console.log(`${image} is ready on 127.0.0.1:${port} (container ${name})`);
    return await runSteps(plan, databaseUrls(port, password));
  } finally {
    await run('docker', ['rm', '--force', '--volumes', name], { stdio: 'ignore' });
    console.log(`Removed container ${name}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // An interrupt from the terminal reaches the running check too, which then
  // stops on its own; on other signals the check is ended here.
  onInterrupt((signal, code) => {
    interrupted = code;
    if (signal !== 'SIGINT' && current) end(current.child, signal);
  });
  try {
    const [check, ...extra] = process.argv.slice(2);
    const plan = steps(check, extra);
    process.exitCode = await withDatabase(`education-db-${randomBytes(4).toString('hex')}`, plan);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = interrupted || 1;
  }
}
