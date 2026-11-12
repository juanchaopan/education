import { expect, it } from 'vitest';
import pg from 'pg';
import { hardenStagingTables, revokeStagingDefaults } from './staging.js';

// Grants the hosted data API roles everything, as a fresh hosted project would.
async function grantHostedRoles(pool: pg.Pool) {
  for (const role of ['anon', 'authenticated']) {
    await pool.query(
      `DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await pool.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${role}`);
    await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${role}`);
  }
}

async function publicTablesWithoutRowSecurity(pool: pg.Pool) {
  const { rows } = await pool.query<{ n: number }>(
    "SELECT count(*)::int n FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND NOT relrowsecurity",
  );
  return rows[0]!.n;
}

async function readable(pool: pg.Pool, role: string, table: string) {
  const { rows } = await pool.query<{ allowed: boolean }>(
    'SELECT has_table_privilege($1, $2, $3) AS allowed',
    [role, `public.${table}`, 'SELECT'],
  );
  return rows[0]!.allowed;
}

it('denies the hosted data API roles table access while the server owner can use accounts', async () => {
  if (!process.env.DATABASE_URL?.endsWith('/education_test'))
    throw new Error('Use the isolated education_test database');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await grantHostedRoles(pool);
    await revokeStagingDefaults(pool);
    await pool.query('CREATE TABLE public.staging_access_fixture (value integer)');
    expect(await readable(pool, 'anon', 'staging_access_fixture')).toBe(false);
    await pool.query('DROP TABLE public.staging_access_fixture');
    await hardenStagingTables(pool);
    await hardenStagingTables(pool);
    expect(await publicTablesWithoutRowSecurity(pool)).toBe(0);
    for (const role of ['anon', 'authenticated'])
      expect(await readable(pool, role, 'parents')).toBe(false);
    for (const table of [
      'email_verifications',
      'verification_attempts',
      'password_resets',
      'recovery_attempts',
      'key_generation_attempts',
      'child_registrations',
      'child_sessions',
      'attempts',
      'progress',
      'help_events',
      'book_assignments',
      'ai_consents',
      'ai_usage',
    ])
      expect(await readable(pool, 'anon', table)).toBe(false);
    await expect(pool.query('SELECT count(*) FROM parents')).resolves.toBeDefined();
  } finally {
    await pool.end();
  }
});

it('closes the deletion ledger to the hosted data API roles', async () => {
  if (!process.env.DELETION_LEDGER_URL?.endsWith('/education_ledger_test'))
    throw new Error('Use the isolated education_ledger_test database');
  const pool = new pg.Pool({ connectionString: process.env.DELETION_LEDGER_URL });
  try {
    await grantHostedRoles(pool);
    await revokeStagingDefaults(pool);
    await hardenStagingTables(pool);
    expect(await publicTablesWithoutRowSecurity(pool)).toBe(0);
    for (const role of ['anon', 'authenticated'])
      expect(await readable(pool, role, 'family_deletions')).toBe(false);
    await expect(pool.query('SELECT count(*) FROM family_deletions')).resolves.toBeDefined();
  } finally {
    await pool.end();
  }
});
