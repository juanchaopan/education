import { randomBytes, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { tokenHash } from '../apps/api/src/identity/services/session-security.js';

const token = () => randomBytes(32).toString('base64url');

// A family with a verified parent and the named children, each signed in with
// a session of their own. The caller deletes the family when done.
export async function seedSignedInFamily(pool: pg.Pool, nicknames: readonly string[]) {
  const family = randomUUID();
  const parent = token();
  const children = nicknames.map((nickname) => ({ id: randomUUID(), nickname, token: token() }));
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'fixture',true) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     SELECT $3,id,1,1,now()+interval '1 hour',true FROM parent`,
    [family, `${family}@example.test`, tokenHash(parent)],
  );
  for (const child of children) {
    await pool.query(
      `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,$2,$3,$3,'fixture',1)`,
      [child.id, family, child.nickname],
    );
    await pool.query(
      `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
       VALUES($1,$2,1,1,now()+interval '1 hour')`,
      [tokenHash(child.token), child.id],
    );
  }
  return { family, parent, children };
}
