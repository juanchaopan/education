import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { csrfToken, tokenHash } from './identity/services/session-security.js';

export const fixtureOrigin = 'https://education.example';

// Families written straight into the isolated test database, each with a parent
// and children who hold live sessions, for integration tests that drive the
// routes. `close` removes every family made here and ends the pool.
export function familyFixtures() {
  if (!process.env.DATABASE_URL?.endsWith('/education_test'))
    throw new Error('Use isolated education_test');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const families: string[] = [];

  async function household(verified = true) {
    const family = randomUUID();
    const token = randomBytes(32).toString('base64url');
    families.push(family);
    await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
    await pool.query(
      `WITH parent AS (
         INSERT INTO parents(family_id,email,password_hash,email_verified)
         VALUES($1,$2,'fixture',$3) RETURNING id
       )
       INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
       SELECT $4,id,1,1,now()+interval '1 day',$3 FROM parent`,
      [family, `${family}@example.test`, verified, tokenHash(token)],
    );
    return { family, token };
  }

  async function learner(family: string, nickname: string) {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    await pool.query(
      `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,$2,$3,$3,'fixture',1)`,
      [id, family, nickname],
    );
    await pool.query(
      `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
       VALUES($1,$2,1,1,now()+interval '1 day')`,
      [tokenHash(token), id],
    );
    return { id, token };
  }

  async function close() {
    await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
    await pool.end();
  }

  return { pool, household, learner, close };
}

// The headers a browser sends with a session request from the site's origin.
export const sessionHeaders = (token: string) => ({
  cookie: `__Host-education_session=${token}`,
  origin: fixtureOrigin,
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
});
