import type pg from 'pg';
import type { AiConsentView } from '@education/contracts';
import {
  type BillingResult,
  reservationCost,
  TUTORING_MODEL,
  usageCost,
} from '../domain/tutoring-cost.js';

const FAMILY_REQUESTS_PER_MINUTE = 18;
const CHILD_REQUESTS_PER_MINUTE = 6;
const currentMonth = "date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')::date";
const budgetAllowsNext = `
  NOT COALESCE(bool_or(state = 'out-of-bounds'), false)
  AND ($1::bigint IS NULL OR COALESCE(sum(amount_nanodollars), 0) + $2::bigint <= $1)`;

export function createTutoringUsage(pool: pg.Pool, cap: bigint | null) {
  return {
    async reserve(client: pg.PoolClient, child: string) {
      // The statement after acquiring the transaction lock sees prior committed reservations.
      await client.query('SELECT pg_advisory_xact_lock(351907, 39)');
      const result = await client.query<{ id: string }>(
        `WITH admission_time AS (
           SELECT clock_timestamp() AS now
         ), limits AS (
           SELECT now, date_trunc('month', now AT TIME ZONE 'UTC')::date AS month FROM admission_time
         )
         INSERT INTO ai_usage(family_id,child_id,model,budget_month,admitted_at,amount_nanodollars)
         SELECT c.family_id,c.id,$4,l.month,l.now,$2 FROM children c CROSS JOIN limits l
         WHERE c.id=$3
           AND (SELECT ${budgetAllowsNext} FROM ai_usage WHERE budget_month=l.month)
           AND (SELECT count(*) FROM ai_usage
                WHERE family_id=c.family_id AND admitted_at>l.now-interval '1 minute') < $5
           AND (SELECT count(*) FROM ai_usage
                WHERE child_id=c.id AND admitted_at>l.now-interval '1 minute') < $6
         RETURNING id`,
        [
          cap,
          reservationCost,
          child,
          TUTORING_MODEL,
          FAMILY_REQUESTS_PER_MINUTE,
          CHILD_REQUESTS_PER_MINUTE,
        ],
      );
      return result.rows[0]?.id;
    },
    async settle(id: string, result: BillingResult) {
      const usage = 'usage' in result ? result.usage : undefined;
      const amount = usage ? usageCost(usage) : null;
      await pool.query(
        `UPDATE ai_usage SET state=$2, input_tokens=$3, output_tokens=$4,
          amount_nanodollars=CASE
            WHEN $2='released' THEN 0
            WHEN $2='settled' THEN $5
            WHEN $2='out-of-bounds' THEN greatest(amount_nanodollars,$5)
            ELSE amount_nanodollars END
         WHERE id=$1 AND state='reserved'`,
        [id, result.status, usage?.inputTokens, usage?.outputTokens, amount],
      );
    },
    async status(client: pg.PoolClient): Promise<AiConsentView['tutoringBudget']> {
      if (cap === null) return 'unset';
      const { rows } = await client.query<{ allowed: boolean }>(
        `SELECT ${budgetAllowsNext} AS allowed FROM ai_usage WHERE budget_month=(SELECT ${currentMonth})`,
        [cap, reservationCost],
      );
      return rows[0]?.allowed ? 'available' : 'limited';
    },
  };
}
