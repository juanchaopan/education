import type pg from 'pg';
import { aiUsageState } from './schema.js';

type State = (typeof aiUsageState.enumValues)[number];
type Calls = Record<State, number>;
type AiUsageAlert = 'provider-failing' | 'reply-out-of-bounds';

// Provider calls admitted in a window, by how they were settled, with their
// tokens and the cost held against the budget. Nothing in it names a family or
// child or holds what was sent.
export type AiUsageReport = {
  since: string;
  until: string;
  calls: Calls;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  alerts: AiUsageAlert[];
};

// The provider is failing when, of the calls sent to it, at least three and at
// least half got no reply at all (unknown) or one outside the agreed bounds; a
// few failures among many successes, or calls never sent, are not an outage. A
// single reply outside the bounds is worth an alert by itself: it pauses paid AI
// for the rest of the budget month.
export function usageAlerts(calls: Calls): AiUsageAlert[] {
  const failed = calls.unknown + calls['out-of-bounds'];
  const sent = failed + calls.settled;
  return [
    ...(failed >= 3 && failed * 2 >= sent ? (['provider-failing'] as const) : []),
    ...(calls['out-of-bounds'] > 0 ? (['reply-out-of-bounds'] as const) : []),
  ];
}

export async function summarizeAiUsage(
  pool: pg.Pool,
  { since, until }: { since: Date; until: Date },
): Promise<AiUsageReport> {
  const { rows } = await pool.query<{
    state: State;
    calls: string;
    input_tokens: string;
    output_tokens: string;
    amount: string;
  }>(
    `SELECT state, count(*) AS calls,
        coalesce(sum(input_tokens),0) AS input_tokens,
        coalesce(sum(output_tokens),0) AS output_tokens,
        coalesce(sum(amount_nanodollars),0) AS amount
      FROM ai_usage WHERE admitted_at>=$1 AND admitted_at<$2 GROUP BY state`,
    [since, until],
  );
  const calls = Object.fromEntries(aiUsageState.enumValues.map((state) => [state, 0])) as Calls;
  let inputTokens = 0;
  let outputTokens = 0;
  let nanodollars = 0n;
  for (const row of rows) {
    calls[row.state] = Number(row.calls);
    inputTokens += Number(row.input_tokens);
    outputTokens += Number(row.output_tokens);
    nanodollars += BigInt(row.amount);
  }
  return {
    since: since.toISOString(),
    until: until.toISOString(),
    calls,
    inputTokens,
    outputTokens,
    costUsd: Number(nanodollars) / 1e9,
    alerts: usageAlerts(calls),
  };
}
