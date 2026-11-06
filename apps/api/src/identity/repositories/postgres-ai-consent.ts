import type pg from 'pg';
import type { AiConsentChange } from '@education/contracts';

type Decision = Pick<AiConsentChange, 'scope' | 'policyVersion' | 'granted'> & {
  revision: string;
};

export async function readAiConsent(client: pg.PoolClient, family: string) {
  const { rows } = await client.query<Decision>(
    `SELECT scope,policy_version AS "policyVersion",granted,revision
     FROM ai_consents WHERE family_id=$1`,
    [family],
  );
  return rows;
}

export async function saveAiConsent(
  client: pg.PoolClient,
  family: string,
  { scope, policyVersion, granted }: AiConsentChange,
) {
  await client.query(
    `INSERT INTO ai_consents(family_id,scope,policy_version,granted)
     VALUES($1,$2,$3,$4) ON CONFLICT(family_id,scope) DO UPDATE
     SET policy_version=excluded.policy_version,granted=excluded.granted,
       revision=excluded.revision,changed_at=excluded.changed_at`,
    [family, scope, policyVersion, granted],
  );
}

export async function childHasAiConsent(
  client: pg.PoolClient,
  child: string,
  { scope, policyVersion }: Pick<AiConsentChange, 'scope' | 'policyVersion'>,
) {
  const { rowCount } = await client.query(
    `SELECT 1 FROM children c JOIN ai_consents a ON a.family_id=c.family_id
     WHERE c.id=$1 AND a.scope=$2 AND a.policy_version=$3 AND a.granted`,
    [child, scope, policyVersion],
  );
  return rowCount === 1;
}
