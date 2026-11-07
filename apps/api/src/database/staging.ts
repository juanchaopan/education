import type pg from 'pg';

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

// Hosted data APIs reach public tables through the anon and authenticated
// roles. Every public table the migrating role owns, in the application
// database or the deletion ledger, gets row-level security and loses their
// grants, so a table a later migration adds is covered without being listed
// here. Tables the provider or an extension owns are left to their owner.
export async function hardenStagingTables(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roles = await client.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')",
    );
    const tables = await client.query<{ name: string }>(
      `SELECT quote_ident(tablename) AS name FROM pg_tables
       WHERE schemaname='public' AND tableowner=current_user ORDER BY tablename`,
    );
    for (const { name } of tables.rows) {
      await client.query(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY`);
      for (const { rolname } of roles.rows) {
        await client.query(`REVOKE ALL ON TABLE public.${name} FROM ${rolname}`);
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
