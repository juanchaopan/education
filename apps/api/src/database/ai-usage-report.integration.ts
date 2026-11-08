import { expect, it } from 'vitest';
import pg from 'pg';
import { summarizeAiUsage } from './ai-usage-report.js';

// The month lies far in the past, where no other test writes usage.
const since = new Date('2001-03-01T00:00:00Z');
const until = new Date('2001-03-01T01:00:00Z');
const none = { reserved: 0, released: 0, unknown: 0, settled: 0, 'out-of-bounds': 0 };

it('summarizes a window by settlement, tokens and cost, and sees a month paused by a bad reply', async () => {
  if (!process.env.DATABASE_URL) throw new Error('An isolated DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const ids: string[] = [];
  const insert = async (minute: number, state: string, amount: number, tokens?: number) => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO ai_usage(model,budget_month,admitted_at,state,amount_nanodollars,input_tokens,output_tokens)
        VALUES('synthetic-model','2001-03-01',$1,$2::ai_usage_state,$3,$4,$4) RETURNING id`,
      [new Date(since.getTime() + minute * 60_000), state, amount, tokens ?? null],
    );
    ids.push(rows[0]!.id);
  };
  try {
    await insert(0, 'settled', 2_000_000, 100);
    await insert(10, 'settled', 3_000_000, 50);
    await insert(20, 'unknown', 9_000_000);
    await insert(30, 'released', 0);
    await insert(59, 'reserved', 9_000_000);
    await insert(60, 'unknown', 9_000_000);
    await insert(-1, 'unknown', 9_000_000);
    expect(await summarizeAiUsage(pool, { since, until })).toEqual({
      since: since.toISOString(),
      until: until.toISOString(),
      calls: { reserved: 1, released: 1, unknown: 1, settled: 2, 'out-of-bounds': 0 },
      inputTokens: 150,
      outputTokens: 150,
      costUsd: 0.023,
      paused: false,
      observed: true,
      alerts: [],
    });

    await insert(14 * 24 * 60, 'out-of-bounds', 9_000_000, 9_000);
    const later = {
      since: new Date('2001-03-20T00:00:00Z'),
      until: new Date('2001-03-20T01:00:00Z'),
    };
    expect(await summarizeAiUsage(pool, later)).toMatchObject({
      calls: none,
      paused: true,
      observed: true,
      alerts: ['reply-out-of-bounds'],
    });
    const nextMonth = {
      since: new Date('2001-04-02T00:00:00Z'),
      until: new Date('2001-04-02T01:00:00Z'),
    };
    expect(await summarizeAiUsage(pool, nextMonth)).toMatchObject({
      calls: none,
      paused: false,
      observed: false,
      alerts: [],
    });
  } finally {
    await pool.query('DELETE FROM ai_usage WHERE id=ANY($1::uuid[])', [ids]);
    await pool.end();
  }
});
