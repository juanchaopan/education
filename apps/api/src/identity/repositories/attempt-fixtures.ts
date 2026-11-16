import type pg from 'pg';
import { pseudonym } from './auth-admission.js';

// How many attempts a budget holds, for the database tests.
export async function attemptCount(pool: pg.Pool, secret: string, name: string) {
  const result = await pool.query<{ n: number }>(
    'SELECT count(*)::int n FROM registration_attempts WHERE bucket=$1',
    [pseudonym(secret, name)],
  );
  return result.rows[0]!.n;
}

// How long a test may take that hashes a password or PIN for each of dozens
// of sign-ins.
export const manyHashes = 60_000;
