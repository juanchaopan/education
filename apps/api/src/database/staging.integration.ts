import { expect, it } from 'vitest';
import pg from 'pg';
import { hardenStagingTables, revokeStagingDefaults } from './staging.js';

it('denies anonymous Supabase-style table access while the server owner can use accounts', async () => {
  if (!process.env.DATABASE_URL?.endsWith('/education_test'))
    throw new Error('Use the isolated education_test database');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const role of ['anon', 'authenticated']) {
      await pool.query(
        `DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      );
      await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
      await pool.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${role}`);
      await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${role}`);
    }
    await revokeStagingDefaults(pool);
    await pool.query('CREATE TABLE public.staging_access_fixture (value integer)');
    expect(
      (
        await pool.query(
          "SELECT has_table_privilege('anon', 'public.staging_access_fixture', 'SELECT') allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
    await pool.query('DROP TABLE public.staging_access_fixture');
    await hardenStagingTables(pool);
    await hardenStagingTables(pool);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relrowsecurity",
        )
      ).rows[0].n,
    ).toBe(19);
    for (const role of ['anon', 'authenticated']) {
      expect(
        (
          await pool.query(
            "SELECT has_table_privilege($1, 'public.parents', 'SELECT') AS allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
    }
    await expectTablesPrivate(pool);
    await expect(pool.query('SELECT count(*) FROM parents')).resolves.toBeDefined();
  } finally {
    await pool.end();
  }
});

async function expectTablesPrivate(pool: pg.Pool) {
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
    'assignments',
    'ai_consents',
    'ai_usage',
  ]) {
    expect(
      (
        await pool.query("SELECT has_table_privilege('anon', $1, 'SELECT') AS allowed", [
          `public.${table}`,
        ])
      ).rows[0].allowed,
    ).toBe(false);
  }
}
