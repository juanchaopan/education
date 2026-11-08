import type pg from 'pg';
import { aiUsageState } from './schema.js';

type State = (typeof aiUsageState.enumValues)[number];
type Calls = Record<State, number>;
type AiUsageAlert = 'provider-failing' | 'reply-out-of-bounds';

// Provider calls admitted in a window, by how they were settled, with their
// tokens and the cost held against the budget, and whether paid AI is paused
// for the window's budget month. Nothing in it names a family or child or holds
// what was sent. `observed` is false when the window says nothing either way:
// no call ended and paid AI is not paused.
export type AiUsageReport = {
  since: string;
  until: string;
  calls: Calls;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  paused: boolean;
  observed: boolean;
  alerts: AiUsageAlert[];
};

// A call ends without a usable reply when the provider rejected it before any
// work (released), gave no reply (unknown) or answered outside the agreed
// bounds; a call cancelled before it was sent is also released, which is rare
// enough to count the same. The provider is failing when at least three and at
// least half of the calls that ended did so. A reply outside the bounds pauses
// paid AI for the rest of the budget month, which is an alert until the month
// ends.
export function usageAlerts(calls: Calls, paused: boolean): AiUsageAlert[] {
  const failed = calls.released + calls.unknown + calls['out-of-bounds'];
  const ended = failed + calls.settled;
  return [
    ...(failed >= 3 && failed * 2 >= ended ? (['provider-failing'] as const) : []),
    ...(paused ? (['reply-out-of-bounds'] as const) : []),
  ];
}

function endedCalls(calls: Calls) {
  return calls.released + calls.unknown + calls['out-of-bounds'] + calls.settled;
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
  const month = await pool.query<{ paused: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ai_usage WHERE state='out-of-bounds'
        AND budget_month=date_trunc('month', $1::timestamptz AT TIME ZONE 'UTC')::date) AS paused`,
    [until],
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
  const paused = month.rows[0]?.paused === true;
  return {
    since: since.toISOString(),
    until: until.toISOString(),
    calls,
    inputTokens,
    outputTokens,
    costUsd: Number(nanodollars) / 1e9,
    paused,
    observed: paused || endedCalls(calls) > 0,
    alerts: usageAlerts(calls, paused),
  };
}
