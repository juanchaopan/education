import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { currentChildSession, currentSession } from './session-query.js';

type Row = { time_zone: string | null };

// The family's own time zone, or null until a parent's device has set one.
export async function readFamilyTimeZone(client: pg.PoolClient, familyId: string) {
  const { rows } = await client.query<Row>('SELECT time_zone FROM families WHERE id=$1', [
    familyId,
  ]);
  return rows[0]?.time_zone ?? null;
}

// The zone of the family a current session belongs to: a parent's verified
// session or a child's. Every page reads it, so it takes no row locks and
// leaves the session as it is; a session ending meanwhile only means the
// next page reads no zone. Undefined when the token holds no current session.
export async function readSessionFamilyTimeZone(
  pool: pg.Pool,
  hash: string,
): Promise<string | null | undefined> {
  const { rows } = await drizzle(pool).execute<Row>(sql`
    SELECT f.time_zone FROM parent_sessions s
      JOIN parents p ON s.parent_id=p.id JOIN families f ON p.family_id=f.id
      WHERE s.token_hash=${hash} AND ${currentSession} AND s.verified AND p.email_verified
    UNION ALL
    SELECT f.time_zone FROM child_sessions s
      JOIN children c ON c.id=s.child_id JOIN families f ON c.family_id=f.id
      WHERE s.token_hash=${hash} AND ${sql.raw(currentChildSession)}
    LIMIT 1`);
  return rows.length ? rows[0]!.time_zone : undefined;
}

// Saves the family's zone and returns the zone it holds afterwards. With
// `fill`, a zone the family already has stays.
export async function saveFamilyTimeZone(
  client: pg.PoolClient,
  familyId: string,
  timeZone: string,
  fill: boolean,
) {
  const { rows } = await client.query<{ time_zone: string }>(
    `UPDATE families SET time_zone=CASE WHEN $3 AND time_zone IS NOT NULL THEN time_zone ELSE $2 END
    WHERE id=$1 RETURNING time_zone`,
    [familyId, timeZone, fill],
  );
  return rows[0]!.time_zone;
}
