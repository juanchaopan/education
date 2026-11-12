import type pg from 'pg';

type Row = { time_zone: string | null };

// The family's own time zone, or null until a parent's device has set one.
export async function readFamilyTimeZone(client: pg.PoolClient, familyId: string) {
  const { rows } = await client.query<Row>('SELECT time_zone FROM families WHERE id=$1', [
    familyId,
  ]);
  return rows[0]?.time_zone ?? null;
}

export async function readChildFamilyTimeZone(client: pg.PoolClient, childId: string) {
  const { rows } = await client.query<Row>(
    'SELECT f.time_zone FROM families f JOIN children c ON c.family_id=f.id WHERE c.id=$1',
    [childId],
  );
  return rows[0]?.time_zone ?? null;
}

export async function saveFamilyTimeZone(
  client: pg.PoolClient,
  familyId: string,
  timeZone: string,
) {
  await client.query('UPDATE families SET time_zone=$2 WHERE id=$1', [familyId, timeZone]);
}
