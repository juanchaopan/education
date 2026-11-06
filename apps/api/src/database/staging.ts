import type pg from 'pg';

const tables = [
  'families',
  'parents',
  'children',
  'child_registrations',
  'registration_keys',
  'key_generation_attempts',
  'drafts',
  'attempts',
  'progress',
  'help_events',
  'registration_attempts',
  'parent_sessions',
  'child_sessions',
  'email_verifications',
  'verification_attempts',
  'password_resets',
  'recovery_attempts',
];

export async function revokeStagingDefaults(pool: pg.Pool) {
  const roles = await pool.query<{ rolname: string }>(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')",
  );
  for (const { rolname } of roles.rows) {
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${rolname}`,
    );
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${rolname}`,
    );
  }
}

export async function hardenStagingTables(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roles = await client.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')",
    );
    for (const table of tables) {
      await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      for (const { rolname } of roles.rows) {
        await client.query(`REVOKE ALL ON TABLE public.${table} FROM ${rolname}`);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
