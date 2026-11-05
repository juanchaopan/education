import { expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { cleanupVerificationMail } from './mail-retention.js';
it('scheduled maintenance clears expired payloads without touching valid delivery intents', async () => {
  if (!process.env.DATABASE_URL) throw new Error('An isolated DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const family = (await pool.query('INSERT INTO families DEFAULT VALUES RETURNING id')).rows[0].id;
  try {
    const parent = (
      await pool.query(
        'INSERT INTO parents(family_id,email,password_hash) VALUES($1,$2,$3) RETURNING id',
        [family, `retention-${randomUUID()}@example.test`, 'test-only'],
      )
    ).rows[0].id;
    await pool.query(
      `INSERT INTO email_verifications(parent_id,id,token_hash,payload,status,expires_at)
      VALUES($1,$2,$3,'protected-test-payload','retryable',now()+interval '1 hour')`,
      [parent, randomUUID(), randomUUID()],
    );
    await cleanupVerificationMail(pool);
    expect(
      (await pool.query('SELECT payload FROM email_verifications WHERE parent_id=$1', [parent]))
        .rows[0].payload,
    ).toBe('protected-test-payload');
    await pool.query(
      "UPDATE email_verifications SET expires_at=now()-interval '1 second' WHERE parent_id=$1",
      [parent],
    );
    await cleanupVerificationMail(pool);
    expect(
      (
        await pool.query('SELECT payload,status FROM email_verifications WHERE parent_id=$1', [
          parent,
        ])
      ).rows[0],
    ).toEqual({ payload: null, status: 'expired' });
  } finally {
    await pool.query('DELETE FROM families WHERE id=$1', [family]);
    await pool.end();
  }
});
