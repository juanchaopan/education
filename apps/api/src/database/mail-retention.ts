import type pg from 'pg';
// Hourly maintenance is independent of browser traffic and never sends mail.
export async function cleanupVerificationMail(pool: pg.Pool) {
  const result = await pool.query(`UPDATE email_verifications SET payload=NULL,status='expired'
    WHERE expires_at<=now() AND consumed_at IS NULL AND status<>'expired'`);
  await pool.query(
    "DELETE FROM verification_attempts WHERE attempted_at<=now()-interval '24 hours'",
  );
  return result.rowCount ?? 0;
}
