import { stagingMailEnv } from './staging-mail-env.mjs';
import { stagingLedgerEnv } from './staging-ledger-env.mjs';
import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { deletionLedgerDatabase } from '../apps/api/dist/shared/database-config.js';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { hardenStagingTables, revokeStagingDefaults } from '../apps/api/dist/database/staging.js';
import { releaseStaging, validateSupabaseDatabase } from './staging-release.mjs';
import { releaseFiles, vercelApi } from './staging-vercel.mjs';
import { smokeAccount } from './staging-smoke.mjs';

// Release steps and the processes they start always use the hosted TLS rules.
const hosted = { ...process.env, STAGING_DATABASE: 'true' };

function required(name) {
  if (!process.env[name]) throw new Error(`Missing staging configuration: ${name}`);
  return process.env[name];
}

async function cleanupAccount(pool, email) {
  if (!/^staging-smoke-[a-f0-9-]+@example\.invalid$/.test(email))
    throw new Error('Refusing non-smoke cleanup');
  await pool.query(
    `DELETE FROM families f USING parents p WHERE p.family_id=f.id AND p.email=$1
    AND NOT EXISTS (SELECT 1 FROM parents other WHERE other.family_id=f.id AND other.id<>p.id)
    AND NOT EXISTS (SELECT 1 FROM children c WHERE c.family_id=f.id)`,
    [email],
  );
}

function assertCurrent(revision) {
  const head = execFileSync(
    'gh',
    ['api', 'repos/juanchaopan/education/git/ref/heads/main', '--jq', '.object.sha'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
  if (head !== revision)
    throw new Error('Main changed; leave staging unchanged until its next successful CI');
}

// The migration covers every configured database; each one's tables are then
// closed to the hosted data API roles.
async function migrate(pools) {
  await Promise.all(pools.map(revokeStagingDefaults));
  try {
    execFileSync(process.execPath, ['apps/api/dist/database/migrate.js'], {
      stdio: 'pipe',
      timeout: 60000,
      env: hosted,
    });
  } catch {
    throw new Error('Controlled staging migration failed');
  }
  await Promise.all(pools.map((pool) => hardenStagingTables(pool)));
}

async function deploy() {
  validateSupabaseDatabase(required('DATABASE_URL'), required('STAGING_SUPABASE_PROJECT_REF'));
  const revision = required('RELEASE_SHA');
  if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== revision)
    throw new Error('Checkout does not match release SHA');
  execFileSync('git', ['diff', '--exit-code', 'HEAD'], { stdio: 'pipe' });
  const teamId = required('STAGING_VERCEL_TEAM_ID');
  const ledgerEnv = stagingLedgerEnv(process.env);
  const runtimeEnv = {
    ...stagingMailEnv(process.env, required('STAGING_ORIGIN')),
    ...ledgerEnv,
    DATABASE_URL: required('DATABASE_URL'),
    AUTH_RATE_LIMIT_KEY: required('AUTH_RATE_LIMIT_KEY'),
    PIN_PEPPER: required('PIN_PEPPER'),
    DATABASE_CA_CERT: process.env.DATABASE_CA_CERT ?? '',
  };
  if (runtimeEnv.AUTH_RATE_LIMIT_KEY.length < 32)
    throw new Error('Staging rate-limit key must contain at least 32 characters');
  if (!/^[a-fA-F0-9]{64}$/.test(runtimeEnv.PIN_PEPPER))
    throw new Error('Staging PIN pepper must contain 64 hexadecimal characters');
  const pool = maintenancePool(hosted);
  const pools = [
    pool,
    ...(ledgerEnv.DELETION_LEDGER_URL ? [maintenancePool(hosted, deletionLedgerDatabase)] : []),
  ];
  try {
    const result = await releaseStaging({
      revision,
      teamId,
      origin: required('STAGING_ORIGIN'),
      projectId: required('STAGING_VERCEL_PROJECT_ID'),
      api: vercelApi(required('VERCEL_TOKEN'), teamId),
      files: await releaseFiles(),
      runtimeEnv,
      wait: setTimeout,
      stillCurrent: () => assertCurrent(revision),
      migrate: () => migrate(pools),
      smoke: (url, origin, sha) =>
        smokeAccount(url, origin, sha, (email) => cleanupAccount(pool, email)),
    });
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `Staging: ${result.origin}\n\nRevision: ${revision}\n\nDeployment: ${result.deploymentId}\n`,
      );
  } finally {
    await Promise.all(pools.map((each) => each.end()));
  }
}

try {
  await deploy();
} catch (error) {
  const message = error.message
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
  console.error(`::error::Staging release failed: ${message}`);
  process.exitCode = 1;
}
