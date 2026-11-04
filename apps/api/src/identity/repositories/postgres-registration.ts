import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import type { RegistrationRepository } from './registration.js';

class DuplicateEmail extends Error {}

export function createRegistrationStore(pool: pg.Pool): RegistrationRepository['save'] {
  return async (email, passwordHash) => {
    try {
      await drizzle(pool).transaction(async (tx) => {
        const family = await tx.execute<{ id: string }>(
          sql`INSERT INTO families DEFAULT VALUES RETURNING id`,
        );
        const parent = await tx.execute(sql`
          INSERT INTO parents (family_id, email, password_hash)
          VALUES (${family.rows[0]!.id}, ${email}, ${passwordHash})
          ON CONFLICT (email) DO NOTHING RETURNING id`);
        if (parent.rowCount === 0) throw new DuplicateEmail();
      });
    } catch (error) {
      if (!(error instanceof DuplicateEmail)) throw error;
    }
  };
}
