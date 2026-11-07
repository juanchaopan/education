import type pg from 'pg';

// Deleting the family row cascades to every family table: the parent with its
// sessions and account mail, the children with their sessions, learning
// records, drafts and drawings, registration keys and AI consent. AI usage rows
// keep their cost with the family and child cleared, so monthly budgets still
// add up. Removing a family that is already gone changes nothing.
export async function removeFamily(client: pg.PoolClient, familyId: string) {
  // Parent before family, the lock order every parent request uses. A family
  // has one parent account, which a signed-in deletion already holds.
  await client.query('SELECT id FROM parents WHERE family_id=$1 FOR UPDATE', [familyId]);
  await client.query('DELETE FROM families WHERE id=$1', [familyId]);
}
