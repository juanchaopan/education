import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command, compose } from './accounts-compose.mjs';

const directory = await mkdtemp(join(tmpdir(), 'education-accounts-'));
process.env.COMPOSE_PROJECT_NAME = `education-accounts-${randomBytes(6).toString('hex')}`;
process.env.POSTGRES_PASSWORD = randomBytes(24).toString('hex');
process.env.AUTH_RATE_LIMIT_KEY = randomBytes(32).toString('hex');
process.env.ACCOUNTS_TLS_DIR = directory;
process.env.ACCOUNTS_PORT_A ??= '8443';
process.env.ACCOUNTS_PORT_B ??= '8444';

try {
  const certificate = await command('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-keyout',
    join(directory, 'key.pem'),
    '-out',
    join(directory, 'cert.pem'),
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost',
  ]);
  if (certificate.code !== 0)
    throw new Error('Could not generate an isolated localhost certificate');
  console.log('Building the portable application image…');
  await compose(['build', 'migrate'], { timeout: 600_000 });
  console.log('Image built; running migration, cross-instance and outage scenarios…');
  const result = await command(
    'node_modules/.bin/playwright',
    ['test', '--config=playwright.accounts.config.ts'],
    { timeout: 600_000 },
  );
  process.stdout.write(result.output);
  if (result.code !== 0) process.exitCode = 1;
} finally {
  try {
    await compose(['down', '-v', '--remove-orphans']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
