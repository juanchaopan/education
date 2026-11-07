import type pg from 'pg';
import { readAiConsent } from './postgres-ai-consent.js';

// Children and AI consent decisions of one family. Credentials, keys and the
// family code are never selected.
export async function readFamilyAccount(client: pg.PoolClient, familyId: string) {
  const children = await client.query<{ id: string; nickname: string }>(
    'SELECT id,nickname FROM children WHERE family_id=$1 ORDER BY canonical_nickname,id',
    [familyId],
  );
  const consents = await readAiConsent(client, familyId);
  return {
    children: children.rows,
    aiConsents: consents.map(({ scope, policyVersion, granted, changedAt }) => ({
      scope,
      policyVersion,
      granted,
      changedAt: changedAt.toISOString(),
    })),
  };
}
