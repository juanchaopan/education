import type pg from 'pg';
// Hourly maintenance is independent of browser traffic and never sends mail.
export async function cleanupAccountMail(pool: pg.Pool) {
  let count = 0;
  for (const table of ['email_verifications', 'password_resets']) {
    const result = await pool.query(`UPDATE ${table} SET payload=NULL,status='expired'
      WHERE expires_at<=now() AND consumed_at IS NULL AND status<>'expired'`);
    count += result.rowCount ?? 0;
  }
  for (const table of ['verification_attempts', 'recovery_attempts'])
    await pool.query(`DELETE FROM ${table} WHERE attempted_at<=now()-interval '24 hours'`);
  return count;
}
