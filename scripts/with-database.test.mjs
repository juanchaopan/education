import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { test } from 'node:test';
import {
  containerArgs,
  databases,
  databaseUrls,
  freePort,
  image,
  steps,
  user,
} from './with-database.mjs';

const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const ciRuns = [...ci.matchAll(/^\s+- run: (.+)$/gm)].map(([, command]) => command);

test('the container matches the database service of CI', () => {
  assert.match(ci, new RegExp(`image: ${image}$`, 'm'));
  assert.match(ci, new RegExp(`POSTGRES_USER: ${user}$`, 'm'));
  assert.match(ci, new RegExp(`POSTGRES_DB: ${databases.app}$`, 'm'));
  assert.match(ci, new RegExp(`DELETION_LEDGER_URL: postgres://.+/${databases.ledger}$`, 'm'));
});

test('the database check runs the steps of CI in their order', () => {
  const inCi = [
    `psql "$DATABASE_URL" -c 'CREATE DATABASE ${databases.ledger}'`,
    'npm run db:migrate',
    'npm run test:db',
    'npm run db:complete-deletions -w @education/api',
  ].map((command) => ciRuns.indexOf(command));
  assert.ok(inCi.every((index, step) => index >= 0 && (step === 0 || index > inCi[step - 1])));
  assert.deepEqual(steps('db', []), [
    ['run', 'db:migrate'],
    ['run', 'test:db', '-w', '@education/api', '--'],
    ['run', 'db:complete-deletions', '-w', '@education/api'],
  ]);
});

test('the arguments after the check go to its test command', () => {
  assert.deepEqual(steps('db', ['src/session.integration.ts'])[1].slice(-2), [
    '--',
    'src/session.integration.ts',
  ]);
  assert.deepEqual(steps('e2e', ['e2e/session.spec.ts', '--repeat-each=3']), [
    ['run', 'db:migrate'],
    ['run', 'test:e2e', '--', 'e2e/session.spec.ts', '--repeat-each=3'],
  ]);
});

test('an unknown check is refused before anything starts', () => {
  assert.throws(() => steps('visual', []), /db or e2e/);
  assert.throws(() => steps(undefined, []), /db or e2e/);
});

test('the container is published on the loopback address only, without its password', () => {
  const args = containerArgs('education-db-test', 54321);
  assert.ok(args.includes('127.0.0.1:54321:5432'));
  assert.ok(args.includes('POSTGRES_PASSWORD'));
  assert.ok(!args.some((arg) => arg.startsWith('POSTGRES_PASSWORD=')));
  assert.equal(args.at(-1), image);
});

test('the tests reach the application and the ledger databases on the picked port', () => {
  assert.deepEqual(databaseUrls(54321, 'secret'), {
    DATABASE_URL: `postgres://education:secret@127.0.0.1:54321/${databases.app}`,
    DELETION_LEDGER_URL: `postgres://education:secret@127.0.0.1:54321/${databases.ledger}`,
  });
});

test('the picked port is free on the loopback address', async () => {
  const port = await freePort();
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve) => server.close(resolve));
});
